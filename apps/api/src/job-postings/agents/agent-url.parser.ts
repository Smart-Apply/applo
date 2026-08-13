import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, LaunchOptions, Page } from 'playwright';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PromptService } from '../../common/services';
import { buildV1ChatCompletionsUrl } from '../../llm/providers/azure-v1-url.util';
import { assertUrlIsPublic, resolveAndAssertPublic } from '../../common/security/url-safety.util';
import { SsrfEgressProxy } from '../../common/security/ssrf-egress-proxy';

// Define the structured output schema for job posting extraction
// Simplified schema: only core fields + fullText (no structured arrays)
const JobPostingSchema = z.object({
  title: z.string().describe('The job title'),
  company: z
    .string()
    .describe('The company name (NEVER use job board names like Workwise/LinkedIn)'),
  location: z
    .string()
    .nullable()
    .describe('The job location (city, country), or null if not specified'),
  language: z
    .string()
    .describe(
      'ISO 639-1 language code (e.g., "de", "en", "fr", "es", "it", "pt", "nl", "pl", "tr", "ar", "zh", "ja")',
    ),
  fullText: z
    .string()
    .describe(
      'Complete job posting text including description, requirements, responsibilities, benefits, salary, etc. Keep original language and formatting.',
    ),
});

export type JobPostingExtraction = z.infer<typeof JobPostingSchema>;

// Constants
// Input cap: most job postings fit in <6K chars after segmentation. 8K leaves
// headroom for long postings while cutting LLM input-token latency vs 12K.
const MAX_CONTENT_LENGTH = 8000;
const LLM_TEMPERATURE = 0; // Deterministic — no creative rewriting/translation
// Output cap: the schema is title + company + location + language + fullText.
// Even a verbose 8K-char fullText fits in ~3K tokens. 4K is plenty and keeps
// time-to-first-token + total generation latency low on Azure OpenAI.
const LLM_MAX_TOKENS = 4000;

/**
 * Hard wall-clock cap for the entire agent parse pipeline (browser launch +
 * navigation + LLM extraction). The global Express TimeoutMiddleware excludes
 * this route, so without this cap a hung Playwright page or stuck Azure
 * OpenAI request would tie up the single Fly worker indefinitely.
 */
const AGENT_PARSE_HARD_TIMEOUT_MS = 90_000; // 90s

/**
 * Per-call timeout for the Azure OpenAI HTTP request. Independent of the
 * pipeline cap above — a stuck network connection would otherwise leak fetch
 * sockets even after the parse caller gives up.
 */
const AZURE_OPENAI_FETCH_TIMEOUT_MS = 45_000; // 45s

/**
 * Default idle window before the warm Chromium is evicted.
 *
 * Deliberately 60s rather than the 5 min suggested in #533: staging still runs
 * on a 1GB shared-cpu-1x VM (fly.staging.toml), and an idle Chromium holds
 * ~150-250MB RSS. Override per-environment with AGENT_BROWSER_IDLE_MS.
 */
const DEFAULT_BROWSER_IDLE_MS = 60_000;

/** Upper bound for AGENT_BROWSER_IDLE_MS — stops a typo pinning Chromium for a day. */
const MAX_BROWSER_IDLE_MS = 600_000;

/**
 * Lower bound. A sub-second window would evict the browser before the next
 * parse could ever reuse it, silently turning the warm pool back off.
 */
const MIN_BROWSER_IDLE_MS = 1_000;

/**
 * Recycle the warm browser after this many parses or this much wall-clock
 * age, whichever comes first (security audit 2026-08-13, F12/F13). Idle
 * eviction alone lets a browser live indefinitely under steady traffic —
 * accumulating anything that leaked and stretching the cross-user window of
 * a compromised renderer. A relaunch costs ~1–2s, so recycling every ~25
 * parses / 15 min is noise for users and a hard bound for both risks.
 */
const MAX_PARSES_PER_BROWSER = 25;
const MAX_BROWSER_AGE_MS = 15 * 60_000;

/**
 * Parse AGENT_BROWSER_IDLE_MS. Anything that is not a plain run of digits
 * falls back to the default — deliberately stricter than `Number()`, which
 * would otherwise accept `0x10` (16) and `1e3` (1000) and quietly apply a
 * value the operator did not intend. In-range values are clamped to
 * [MIN, MAX]. Exported for unit testing.
 */
export function resolveBrowserIdleMs(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_BROWSER_IDLE_MS;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return DEFAULT_BROWSER_IDLE_MS;
  const parsed = Number(trimmed);
  if (parsed <= 0) return DEFAULT_BROWSER_IDLE_MS;
  return Math.min(Math.max(parsed, MIN_BROWSER_IDLE_MS), MAX_BROWSER_IDLE_MS);
}

/**
 * Concurrency gate. The agent parser launches a fresh Chromium via Playwright
 * AND the Puppeteer PDF pool can be holding up to 2 more browsers — on a
 * 1 GB shared-cpu-1x Fly VM that means a second concurrent agent parse
 * reliably OOM-kills the worker (kernel SIGKILL, no CORS headers on the
 * in-flight responses). Serialising the agent path keeps RSS bounded.
 */
let inFlightParse: Promise<unknown> | null = null;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AgentUrlParser {
  private readonly logger = new Logger(AgentUrlParser.name);
  private browser: Browser | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  /** Set by shutdown(); guards against a launch completing after teardown. */
  private disposed = false;
  /**
   * Connect-time SSRF enforcement for everything the browser dials — closes
   * the DNS-rebinding TOCTOU between the Node-side checks and Chromium's own
   * resolver (audit F15). Started lazily with the browser, closed in
   * shutdown().
   */
  private readonly egressProxy = new SsrfEgressProxy();
  /** Parses served by the current warm browser (recycle bound, audit F12/F13). */
  private parsesSinceLaunch = 0;
  private browserLaunchedAt = 0;
  private readonly forceNoSandbox: boolean;
  private readonly maxSteps: number;
  private readonly timeout: number;
  private readonly browserIdleMs: number;

  // Azure OpenAI config (read from env, same vars as AzureOpenAIProvider)
  private readonly azureEndpoint: string;
  private readonly azureApiKey: string;
  private readonly azureDeployment: string;
  private readonly azureApiVersion: string;

  constructor() {
    this.maxSteps = parseInt(process.env.AGENT_MAX_STEPS || '10', 10);
    this.timeout = parseInt(process.env.AGENT_TIMEOUT || '30000', 10);
    this.browserIdleMs = resolveBrowserIdleMs(process.env.AGENT_BROWSER_IDLE_MS);
    // Escape hatch for environments that can't sandbox at all (e.g. local
    // Docker, whose default seccomp profile blocks unprivileged user
    // namespaces) — skips the doomed sandboxed launch attempt. See initBrowser.
    this.forceNoSandbox = process.env.AGENT_CHROMIUM_NO_SANDBOX === 'true';

    this.azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    this.azureApiKey = process.env.AZURE_OPENAI_API_KEY || '';
    this.azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '';
    this.azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

    if (!this.azureEndpoint || !this.azureApiKey || !this.azureDeployment) {
      throw new Error(
        'Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME',
      );
    }

    this.logger.log(
      `AgentUrlParser initialized with Azure OpenAI (direct HTTP), ` +
        `browser idle eviction ${this.browserIdleMs}ms`,
    );
  }

  /**
   * Parse job posting from URL using a headless browser + Azure OpenAI extraction.
  /**
   * Parse job posting from URL using a headless browser + Azure OpenAI extraction.
   *
   * Wrapped in:
   *   1. A single-flight gate (`inFlightParse`) so concurrent callers queue
   *      instead of OOM-killing the worker by launching parallel Chromiums.
   *   2. A hard wall-clock cap (`AGENT_PARSE_HARD_TIMEOUT_MS`) so a stuck
   *      Playwright page or Azure OpenAI request can't tie up the worker
   *      forever now that the route is excluded from the global Express
   *      timeout middleware.
   *
   * @param url The job posting URL
   * @returns Structured job posting data
   */
  async parse(url: string): Promise<JobPostingExtraction> {
    // Serialise concurrent parses (see comment on `inFlightParse`).
    if (inFlightParse) {
      this.logger.warn(
        `Another agent parse is already in flight; queueing request for ${url}`,
      );
      try {
        await inFlightParse;
      } catch {
        // Previous parse's failure is irrelevant — we just waited for the slot.
      }
    }

    const run = this.parseInternal(url);
    // The single-flight gate must NEVER reject. The real caller awaits `run`
    // (and handles its rejection), so a rejection on this derived gate promise
    // would be unobserved when no concurrent request is waiting on it — which
    // surfaces as an unhandledRejection and crashes the worker
    // (triggerUncaughtException, fromPromise). Swallow settlement here; the
    // gate only tracks when the Chromium slot frees up.
    const gate = run
      .catch(() => undefined)
      .finally(() => {
        if (inFlightParse === gate) {
          inFlightParse = null;
        }
      });
    inFlightParse = gate;
    return run;
  }

  private async parseInternal(url: string): Promise<JobPostingExtraction> {
    this.logger.log(`Starting agent-based parsing for URL: ${url}`);
    const startTime = Date.now();

    // Hard wall-clock cap for the whole pipeline. Implemented as a
    // Promise.race so we surface a friendly error instead of letting the
    // request hang indefinitely.
    let timeoutHandle: NodeJS.Timeout | undefined;
    let hardTimeoutFired = false;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        hardTimeoutFired = true;
        reject(
          new Error(
            `Agent parser exceeded hard timeout of ${AGENT_PARSE_HARD_TIMEOUT_MS / 1000}s. ` +
              `Please copy the job description text directly into the form.`,
          ),
        );
      }, AGENT_PARSE_HARD_TIMEOUT_MS);
      // Don't keep the event loop alive purely for this timer.
      timeoutHandle.unref?.();
    });

    try {
      const work = (async () => {
        // SSRF guard (security audit F1): block private/internal/link-local
        // targets before launching the browser. `navigateToUrl`'s request
        // interceptor re-checks every subsequent navigation/redirect too, and
        // the egress proxy enforces the same policy at connect time.
        await assertUrlIsPublic(url);
        await this.initBrowser();
        if (!this.browser) {
          throw new Error('Browser not initialized');
        }

        // The page is owned HERE, and closed on every path that reaches this
        // point — including exceptions thrown from the extraction tail calls,
        // which used to strand it (audit F12). The hard-timeout path is the
        // one case this finally can't cover (the closure may be wedged
        // mid-await); the outer catch handles it by closing the whole browser.
        const page = await this.browser.newPage();
        let pageContent: string;
        try {
          await this.navigateToUrl(page, url);
          pageContent = await this.extractPageContent(page);
        } finally {
          await page.close().catch(() => undefined);
        }

        this.detectBotProtection(pageContent, url);
        const extracted = await this.extractStructuredData(pageContent, url);
        this.validateExtraction(extracted);
        return extracted;
      })();

      const extracted = await Promise.race([work, timeoutPromise]);

      const duration = Date.now() - startTime;
      this.logger.log(`Successfully parsed URL in ${duration}ms`);

      return extracted;
    } catch (error) {
      this.logger.error(`Agent parsing failed for ${url}: ${error.message}`);
      throw error;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      this.parsesSinceLaunch += 1;

      if (hardTimeoutFired) {
        // The work closure was abandoned mid-flight — likely a wedged
        // renderer that a page.close() may never reach. Closing the whole
        // browser is the only reliable reaper (audit F12); the next parse
        // relaunches in ~1–2s. Fire-and-forget so a hanging close can't
        // stall this response; closeBrowser nulls the field synchronously.
        this.logger.warn('Hard timeout hit — recycling the warm browser to reap the page');
        void this.closeBrowser();
      } else if (
        this.browser &&
        (this.parsesSinceLaunch >= MAX_PARSES_PER_BROWSER ||
          Date.now() - this.browserLaunchedAt >= MAX_BROWSER_AGE_MS)
      ) {
        // Parse-count / absolute-age recycle bound (audit F12/F13).
        this.logger.debug(
          `Recycling warm browser after ${this.parsesSinceLaunch} parses / ` +
            `${Math.round((Date.now() - this.browserLaunchedAt) / 1000)}s`,
        );
        void this.closeBrowser();
      } else {
        // Leave the browser warm for the next parse, but arm an idle-eviction
        // timer so it doesn't hold memory forever. Relaunching costs ~1–2s, so
        // reuse is the single biggest latency win for back-to-back parses.
        this.scheduleBrowserEviction();
      }
    }
  }

  /**
   * Detect if the page is blocked by bot protection (Cloudflare, CAPTCHA, etc.)
   */
  private detectBotProtection(pageContent: string, url: string): void {
    const contentLower = pageContent.toLowerCase();
    const hostname = new URL(url).hostname;

    const cloudflareBlocked =
      contentLower.includes('you have been blocked') ||
      contentLower.includes('ray id') ||
      contentLower.includes('cloudflare') ||
      (contentLower.includes('request blocked') && contentLower.includes('error'));

    const captchaBlocked =
      contentLower.includes('captcha') ||
      contentLower.includes('verify you are human') ||
      contentLower.includes('i am not a robot') ||
      contentLower.includes('recaptcha');

    const accessDenied =
      contentLower.includes('access denied') ||
      contentLower.includes('403 forbidden') ||
      contentLower.includes('permission denied');

    const rateLimited =
      contentLower.includes('too many requests') ||
      contentLower.includes('rate limit') ||
      contentLower.includes('429');

    if (cloudflareBlocked) {
      this.logger.warn(`Cloudflare block detected for ${hostname}`);
      throw new Error(
        `Diese Webseite (${hostname}) blockiert automatisierte Zugriffe mit Cloudflare. ` +
          `Bitte kopiere die Stellenbeschreibung direkt und füge sie als Text ein.`,
      );
    }

    if (captchaBlocked) {
      this.logger.warn(`CAPTCHA detected for ${hostname}`);
      throw new Error(
        `Diese Webseite (${hostname}) erfordert eine CAPTCHA-Verifizierung. ` +
          `Bitte kopiere die Stellenbeschreibung direkt und füge sie als Text ein.`,
      );
    }

    if (accessDenied) {
      this.logger.warn(`Access denied for ${hostname}`);
      throw new Error(
        `Zugriff auf diese Webseite (${hostname}) wurde verweigert. ` +
          `Bitte kopiere die Stellenbeschreibung direkt und füge sie als Text ein.`,
      );
    }

    if (rateLimited) {
      this.logger.warn(`Rate limited by ${hostname}`);
      throw new Error(
        `Zu viele Anfragen an ${hostname}. Bitte warte einen Moment und versuche es erneut, ` +
          `oder kopiere die Stellenbeschreibung direkt und füge sie als Text ein.`,
      );
    }

    const cleanedContent = pageContent.replace(/\s+/g, ' ').trim();
    if (cleanedContent.length < 300) {
      this.logger.warn(
        `Page content suspiciously short (${cleanedContent.length} chars) for ${hostname}`,
      );
    }
  }

  /**
   * Initialize Playwright browser
   */
  private async initBrowser(): Promise<void> {
    // Cancel any pending idle eviction — a parse is starting.
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Reuse the warm browser when it's still connected. A crashed/disconnected
    // instance is dropped so we relaunch cleanly below.
    if (this.browser) {
      if (this.browser.isConnected()) {
        return;
      }
      this.logger.debug('Warm browser was disconnected; relaunching');
      this.browser = null;
    }

    this.logger.debug('Launching browser...');

    // Every byte the browser sends flows through the loopback egress proxy,
    // which re-resolves each hostname itself and dials only validated public
    // IPs — the connect-time SSRF boundary (audit F14/F15).
    const proxyPort = await this.egressProxy.start();

    const launched = await this.launchChromium(proxyPort);

    // A shutdown() that landed while the launch above was in flight saw
    // `this.browser === null` and closed nothing. Re-check here so we never
    // install a browser that no one is left to close.
    if (this.disposed) {
      await launched.close().catch(() => undefined);
      throw new Error('AgentUrlParser was shut down while the browser was launching');
    }

    this.browser = launched;
    this.parsesSinceLaunch = 0;
    this.browserLaunchedAt = Date.now();
  }

  /**
   * Launch Chromium behind the egress proxy — sandboxed when the platform
   * allows it.
   *
   * `--no-sandbox` used to be unconditional, a leftover from running as root.
   * The image runs as uid 1001 and one warm browser now serves many users'
   * parses in sequence, so a renderer compromise without the sandbox executes
   * as the same OS user as the API and reaches its env + the Fly private
   * network (audit F13). We therefore try the sandboxed launch first and fall
   * back — loudly — only where the kernel can't provide it (e.g. local Docker
   * blocks unprivileged user namespaces via its default seccomp profile).
   * AGENT_CHROMIUM_NO_SANDBOX=true skips the doomed first attempt in such
   * environments. The fallback is exactly the previous behavior, still
   * bounded by the parse-count/age recycle.
   */
  private async launchChromium(proxyPort: number): Promise<Browser> {
    // Only override the binary when CHROMIUM_EXECUTABLE_PATH is explicitly set
    // (the Docker image sets it to the system Chromium it bakes in). Otherwise
    // pass no executablePath so Playwright uses its OWN bundled, version-matched
    // Chromium (installed via `pnpm exec playwright install chromium`).
    //
    // Deliberately NOT falling back to PUPPETEER_EXECUTABLE_PATH: that points at
    // full Google Chrome for the Puppeteer PDF subsystem and is typically a
    // newer build than the Chromium this Playwright release is pinned to —
    // driving a mismatched Chrome over CDP is unsupported and flaky.
    const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;

    const optionsFor = (args: string[]): LaunchOptions => ({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args,
      proxy: {
        server: `http://127.0.0.1:${proxyPort}`,
        // Chromium implicitly bypasses proxies for loopback targets;
        // '<-loopback>' removes that rule so localhost URLs can't sidestep
        // the egress policy.
        bypass: '<-loopback>',
      },
    });

    const baseArgs = ['--disable-dev-shm-usage', '--disable-gpu'];
    const noSandboxArgs = [...baseArgs, '--no-sandbox', '--disable-setuid-sandbox'];

    if (this.forceNoSandbox) {
      this.logger.warn(
        'Chromium sandbox disabled via AGENT_CHROMIUM_NO_SANDBOX — a renderer compromise runs as the API user',
      );
      return chromium.launch(optionsFor(noSandboxArgs));
    }

    try {
      return await chromium.launch(optionsFor(baseArgs));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Sandboxed Chromium launch failed — falling back to --no-sandbox. ` +
          `A renderer compromise then runs as the API user; enable unprivileged user ` +
          `namespaces (or set AGENT_CHROMIUM_NO_SANDBOX=true to silence this attempt). ` +
          `Launch error: ${message.slice(0, 300)}`,
      );
      return chromium.launch(optionsFor(noSandboxArgs));
    }
  }

  /**
   * Navigate the caller-owned page to the URL and wait for dynamic content.
   * The page's lifecycle (close on every path) belongs to parseInternal.
   */
  private async navigateToUrl(page: Page, url: string): Promise<void> {
    await page.setViewportSize({ width: 1920, height: 1080 });

    this.logger.debug(`Navigating to ${url}`);

    // WebSockets bypass page.route entirely — Playwright ships a separate
    // routeWebSocket API precisely because route() cannot see the
    // handshake. Without this, page JS could open ws:// sockets to
    // loopback/6PN targets and read the results into the DOM (audit F14).
    // Job postings don't need live sockets; refuse them all. (The egress
    // proxy would also stop the handshake at connect time — this kills it
    // earliest and cheapest.)
    await page.routeWebSocket('**/*', (ws) => {
      this.logger.warn(`Blocked WebSocket from parsed page: ${ws.url().slice(0, 200)}`);
      ws.close();
    });

    // Cache hostname → "is public" per navigation so a redirect chain
    // through the same host doesn't re-resolve DNS on every request.
    const hostSafetyCache = new Map<string, boolean>();

    // Block heavy resources we never need for text extraction. Cuts page
    // load time and RAM by 30–60% on image-heavy job boards (LinkedIn,
    // Indeed), which also makes the OOM risk on the smaller (1GB staging)
    // Fly VMs smaller.
    //
    // Also blocks SSRF: any top-level navigation (redirect chain) to a
    // private/internal/link-local host is aborted here too, since a
    // public-looking entry URL can still redirect server-side into an
    // internal target after the initial `assertUrlIsPublic` check above.
    // Defense in depth — the egress proxy re-checks at connect time.
    await page.route('**/*', async (route) => {
      const request = route.request();
      const type = request.resourceType();
      if (type === 'image' || type === 'font' || type === 'media' || type === 'stylesheet') {
        return route.abort();
      }

      // Block SSRF across ALL request types: a public document can still load JS
      // that fetches internal URLs and writes the response into the DOM.
      let hostname: string;
      try {
        const u = new URL(request.url());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return route.abort();
        }
        hostname = u.hostname;
      } catch {
        return route.abort();
      }

      let safe = hostSafetyCache.get(hostname);
      if (safe === undefined) {
        try {
          await resolveAndAssertPublic(hostname);
          safe = true;
        } catch {
          safe = false;
        }
        hostSafetyCache.set(hostname, safe);
      }
      if (!safe) {
        this.logger.warn(`Blocked request to non-public host: ${hostname}`);
        return route.abort();
      }

      return route.continue();
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.timeout,
    });

    await page
      .waitForLoadState('networkidle', { timeout: 2500 })
      .catch(() => {
        this.logger.debug('Network idle timeout, proceeding anyway');
      });

    await this.handlePopups(page);
    // Brief settle for late-bound JS content. networkidle above already
    // covered XHR-driven rendering; 400ms is enough for the final paint.
    await page.waitForTimeout(400);
  }

  /**
   * Handle cookie banners and popups.
   *
   * Single in-browser pass instead of a per-selector `isVisible({ timeout })`
   * loop: the old approach issued one CDP roundtrip per selector and waited the
   * full timeout on each miss, costing up to ~7s on the common "no banner"
   * path. This does it in one `evaluate` with zero waiting on misses.
   */
  private async handlePopups(page: Page): Promise<void> {
    try {
      const clicked = await page.evaluate(() => {
        const labels = [
          'accept all',
          'accept',
          'i accept',
          'agree',
          'ok',
          'alle akzeptieren',
          'akzeptieren',
          'zustimmen',
          'alle cookies akzeptieren',
        ];
        const candidates = Array.from(
          document.querySelectorAll(
            'button, [role="button"], a, input[type="button"], input[type="submit"]',
          ),
        ) as HTMLElement[];
        for (const el of candidates) {
          // Skip off-screen / display:none elements.
          if (el.offsetParent === null) continue;
          const label = (
            el.innerText ||
            (el as HTMLInputElement).value ||
            el.getAttribute('aria-label') ||
            ''
          )
            .trim()
            .toLowerCase();
          if (!label || label.length > 30) continue;
          if (labels.some((t) => label === t || label.startsWith(t))) {
            el.click();
            return true;
          }
        }
        // Attribute-based fallback for unlabelled consent buttons.
        const attrMatch = document.querySelector(
          '[id*="accept" i], [class*="accept" i]',
        ) as HTMLElement | null;
        if (attrMatch && attrMatch.offsetParent !== null) {
          attrMatch.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        this.logger.debug('Dismissed cookie/consent popup');
        await page.waitForTimeout(300);
      }
    } catch {
      // Popup handling is best-effort — never block parsing on it.
    }
  }

  /**
   * Extract text content from page using a battery of common selectors.
   */
  private async extractPageContent(page: Page): Promise<string> {
    this.logger.debug('Extracting page content...');

    const mainContentSelectors = [
      // LinkedIn-specific
      '.jobs-description__content',
      '.jobs-description',
      '.show-more-less-html__markup',
      '[class*="jobs-description"]',
      // ID-based
      '#jobDescriptionText',
      '#job-description',
      '#jobDescription',
      '[id*="job-description"]',
      '[id*="jobDescription"]',
      // Class-based
      '.job-description',
      '.job-detail',
      '.job-details',
      '.jobsearch-jobDescriptionText',
      '.posting',
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      // Data attributes
      '[data-testid="job-description"]',
      '[data-testid*="description"]',
      // Semantic HTML
      'main',
      '[role="main"]',
      'article',
      '.content',
    ];

    // Single in-browser pass over all selectors. The previous per-selector
    // isVisible({ timeout: 500 }) loop could waste up to ~13s on misses
    // (26 selectors × 500ms) because each call is a separate CDP roundtrip.
    let bestContent = '';
    let bestSelector = '';
    let bestLength = 0;
    try {
      const result = await page.evaluate((selectors: string[]) => {
        let best = { selector: '', text: '', length: 0 };
        for (const sel of selectors) {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (!el) continue;
          // innerText respects visibility; offsetParent === null catches
          // display:none ancestors that innerText wouldn't otherwise skip.
          if (el.offsetParent === null && el.tagName !== 'BODY') continue;
          const text = (el.innerText || '').trim();
          if (text.length > best.length) {
            best = { selector: sel, text, length: text.length };
          }
        }
        return best;
      }, mainContentSelectors);
      bestContent = result.text;
      bestSelector = result.selector;
      bestLength = result.length;
    } catch {
      // fall through to body fallback below
    }

    if (bestLength < 200) {
      this.logger.debug('No sufficient content from specific selectors, using body as fallback');
      bestContent = await page.locator('body').innerText();
      bestSelector = 'body';
      bestLength = bestContent.length;
    }

    this.logger.debug(`Best selector: ${bestSelector} with ${bestLength} characters`);

    bestContent = this.cleanContent(bestContent);

    let title = await page.title();
    title = title
      .replace(/\s*[-|]\s*(?:Workwise|LinkedIn|Indeed|StepStone|Xing|Monster|Glassdoor)\s*$/gi, '')
      .replace(/\s*at\s+(?:Workwise|LinkedIn|Indeed|StepStone|Xing|Monster|Glassdoor)\s*$/gi, '')
      .trim();

    // NOTE: the page is deliberately NOT closed here. parseInternal owns the
    // page and closes it in a finally — a throw from the tail calls above
    // (body innerText, page.title) used to strand the page forever (audit F12).
    return `Page Title: ${title}\n\n${bestContent}`;
  }

  /**
   * Conservative content cleanup — only remove obvious UI noise.
   */
  private cleanContent(content: string): string {
    const noisePatterns = [
      /sign in to create job alert/gi,
      /new to linkedin\? join now/gi,
      /forgot password\?/gi,
      /get notified about new .* jobs/gi,
      /be among the first \d+ applicants/gi,
      /over \d+ applicants/gi,
      /\d+ applicants/gi,
      /show more\s+show less/gi,
      /apply\s+save\s+share/gi,
      /\n{4,}/g,
    ];

    let cleaned = content;
    for (const pattern of noisePatterns) {
      cleaned = cleaned.replace(pattern, '\n\n');
    }

    const uiKeywords = /^(apply|save|share|report|sign in|join now|back|home|search|filter|show)$/i;
    const lines = cleaned.split('\n');
    const filteredLines: string[] = [];
    const seenLines = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      if (trimmed.length < 20 && uiKeywords.test(trimmed)) continue;

      const normalized = trimmed.toLowerCase();
      if (seenLines.has(normalized)) continue;
      seenLines.add(normalized);

      filteredLines.push(line);
    }

    cleaned = filteredLines.join('\n');

    cleaned = cleaned
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleaned;
  }

  /**
   * Segment content into logical sections (requirements, responsibilities, etc.)
   */
  private segmentContent(content: string): {
    companyInfo?: string;
    requirements?: string;
    responsibilities?: string;
    niceToHave?: string;
    benefits?: string;
    fullContent: string;
  } {
    const sections: Record<string, string> = {};

    const sectionPatterns = [
      {
        key: 'companyInfo',
        regex:
          /(?:über|about)\s+([A-Z][^\n]{2,50})\s*\n([\s\S]{50,800}?)(?=\n\n[A-Z]|was\s+(?:bieten|erwartet|solltest)|$)/gim,
      },
      {
        key: 'requirements',
        regex:
          /(?:was solltest du mitbringen|anforderungen|requirements|qualifications|what you bring|deine qualifikationen|das bringst du mit)\s*[:\n]+([\s\S]{50,1500}?)(?=\n\n(?:[A-Z]|was\s+|bonus|verantwort|aufgaben)|$)/gim,
      },
      {
        key: 'responsibilities',
        regex:
          /(?:was erwartet dich|verantwortlichkeiten|responsibilities|your tasks|deine aufgaben|das erwartet dich|aufgaben)\s*[:\n]+([\s\S]{50,1500}?)(?=\n\n(?:[A-Z]|was\s+|bonus|anforderung)|$)/gim,
      },
      {
        key: 'niceToHave',
        regex:
          /(?:bonuspunkte|von vorteil|idealerweise|wünschenswert|nice to have|bonus points|preferred|would be a plus)\s*[:\n,]+([\s\S]{20,500}?)(?=\n\n[A-Z]|$)/gim,
      },
      {
        key: 'benefits',
        regex:
          /(?:was bieten wir|benefits|what we offer|perks|wir bieten)\s*[:\n]+([\s\S]{50,1000}?)(?=\n\n[A-Z]|$)/gim,
      },
    ];

    for (const { key, regex } of sectionPatterns) {
      const matches = [...content.matchAll(regex)];
      if (matches.length > 0) {
        const match = matches[0];
        const extracted = match[key === 'companyInfo' ? 2 : 1]?.trim();
        if (extracted && extracted.length > 30) {
          sections[key] = extracted;
        }
      }
    }

    return {
      ...sections,
      fullContent: content,
    } as any;
  }

  /**
   * Use Azure OpenAI (direct HTTP) to extract structured job posting data.
   */
  private async extractStructuredData(content: string, url: string): Promise<JobPostingExtraction> {
    this.logger.debug('Using Azure OpenAI to extract structured data...');

    const schema = zodToJsonSchema(JobPostingSchema as any);
    const segments = this.segmentContent(content);
    const companyHint = this.detectCompany(content);

    if (companyHint) {
      this.logger.log(`Detected company: "${companyHint}"`);
    } else {
      this.logger.warn('No company detected — LLM will have to extract from content');
    }

    let structuredContent = segments.fullContent;

    // Cut off at "Similar jobs" section to prevent confusion
    const similarJobsIndex = structuredContent.search(
      /\b(similar jobs|people also viewed|show more jobs|explore collaborative articles)\b/i,
    );
    if (similarJobsIndex !== -1) {
      structuredContent = structuredContent.substring(0, similarJobsIndex);
      this.logger.debug(`Cut content at "Similar jobs" section (position ${similarJobsIndex})`);
    }

    structuredContent = structuredContent.substring(0, MAX_CONTENT_LENGTH);

    if (segments.companyInfo) {
      structuredContent += `\n\n=== COMPANY SECTION ===\n${segments.companyInfo}`;
    }
    if (segments.requirements) {
      structuredContent += `\n\n=== REQUIREMENTS SECTION ===\n${segments.requirements}`;
    }
    if (segments.responsibilities) {
      structuredContent += `\n\n=== RESPONSIBILITIES SECTION ===\n${segments.responsibilities}`;
    }
    if (segments.niceToHave) {
      structuredContent += `\n\n=== NICE TO HAVE SECTION ===\n${segments.niceToHave}`;
    }

    const prompt = await PromptService.renderPrompt('extract-job-posting', {
      url,
      content: structuredContent,
      schema,
      companyHint: companyHint || 'Not detected - extract from content',
    });

    try {
      const responseText = await this.callAzureOpenAI([
        {
          role: 'system',
          content:
            'You are a precise data extraction assistant. Your ONLY job is to COPY text exactly as written. ' +
            'DO NOT translate, rewrite, summarize, or paraphrase. ' +
            'If the text is in German, keep it in German. If English, keep English. ' +
            'COPY EXACTLY - word for word, character for character.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // Extract JSON from markdown code blocks if present
      let jsonText = responseText;
      const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        this.logger.debug('Extracted JSON from markdown code block');
      }

      const parsed = JSON.parse(jsonText);
      const validated = JobPostingSchema.parse(parsed);

      // Override if LLM picked a job board name but we detected the real company
      const jobBoardBlacklist = [
        'Workwise',
        'LinkedIn',
        'Indeed',
        'StepStone',
        'Xing',
        'Monster',
        'Glassdoor',
      ];
      if (companyHint && jobBoardBlacklist.includes(validated.company)) {
        this.logger.warn(
          `LLM extracted blacklisted job board "${validated.company}" — overriding with detected company "${companyHint}"`,
        );
        validated.company = companyHint;
      } else if (companyHint && validated.company !== companyHint) {
        this.logger.warn(
          `Company mismatch — detected: "${companyHint}" but LLM extracted: "${validated.company}"`,
        );
      }

      this.logger.debug('Successfully extracted structured data');
      return validated;
    } catch (error) {
      this.logger.error(`Failed to extract structured data: ${error.message}`);
      throw new Error(`LLM extraction failed: ${error.message}`);
    }
  }

  /**
   * Direct HTTP call to Azure OpenAI chat completions endpoint.
   * Replaces the previous LangChain `AzureChatOpenAI.invoke()` dependency.
   *
   * Uses an AbortController so a stuck connection can't leak sockets.
   * Independent of the outer pipeline timeout in `parseInternal()` — that one
   * gives up the response, this one actually closes the underlying socket.
   */
  private async callAzureOpenAI(messages: ChatMessage[]): Promise<string> {
    // v1 Foundry API: POST {endpoint}/openai/v1/chat/completions with the
    // deployment passed as `model` in the body. The legacy
    // /openai/deployments/{name}/... path only accepts DATED api-versions, so
    // it 404s ('Resource not found') whenever AZURE_OPENAI_API_VERSION is a v1
    // channel value ('preview' / 'v1') — which is exactly what broke URL
    // parsing on staging. buildV1ChatCompletionsUrl normalizes both styles.
    const url = buildV1ChatCompletionsUrl(this.azureEndpoint, this.azureApiVersion);

    const controller = new AbortController();
    const abortTimer = setTimeout(
      () => controller.abort(),
      AZURE_OPENAI_FETCH_TIMEOUT_MS,
    );
    abortTimer.unref?.();

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.azureApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.azureDeployment,
          messages,
          temperature: LLM_TEMPERATURE,
          max_tokens: LLM_MAX_TOKENS,
          // Force JSON-only output so we skip the markdown-fence stripping
          // dance below and the model stops emitting any preamble prose,
          // which also lowers TTFT.
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const e = err as Error & { name?: string };
      if (e.name === 'AbortError') {
        throw new Error(
          `Azure OpenAI request timed out after ${AZURE_OPENAI_FETCH_TIMEOUT_MS / 1000}s`,
        );
      }
      throw err;
    } finally {
      clearTimeout(abortTimer);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Azure OpenAI request failed: ${response.status} ${response.statusText}${errorBody ? ` — ${errorBody.slice(0, 500)}` : ''}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Azure OpenAI returned no content');
    }

    return content;
  }

  /**
   * Detect company name from content using patterns
   */
  private detectCompany(content: string): string | null {
    const aboutPatterns = [
      /über\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}(?:\s+GmbH|\s+AG|\s+SE|\s+Inc\.|\s+LLC|\s+Ltd\.))/i,
      /about\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}(?:\s+GmbH|\s+AG|\s+SE|\s+Inc\.|\s+LLC|\s+Ltd\.))/i,
    ];

    for (const pattern of aboutPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const metadataPatterns = [
      /at\s+([A-Z][A-Za-z0-9\s&.,-]{2,50})\s+(?:Essen|Berlin|Munich|Hamburg|remote)/i,
      /([A-Z][A-Za-z0-9\s&.,-]{2,50}(?:\s+GmbH|\s+AG|\s+SE))\s+\d+\s+(?:hours?|days?|weeks?|months?)\s+ago/i,
    ];

    for (const pattern of metadataPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        const blacklist = [
          'Workwise',
          'LinkedIn',
          'Indeed',
          'StepStone',
          'Job',
          'Career',
          'Talent',
        ];
        if (!blacklist.some((term) => company.includes(term))) {
          return company;
        }
      }
    }

    return null;
  }

  /**
   * Validate that extraction has sufficient data
   */
  private validateExtraction(data: JobPostingExtraction): void {
    if (!data.title || data.title.length < 3) {
      throw new Error('Job title not found or too short');
    }

    if (!data.company || data.company.length < 2) {
      throw new Error('Company name not found or too short');
    }

    if (!data.fullText || data.fullText.length < 50) {
      throw new Error('Insufficient job posting content extracted');
    }
  }

  /**
   * Close browser and cleanup resources
   */
  private async closeBrowser(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.browser) {
      this.logger.debug('Closing browser...');
      const browser = this.browser;
      this.browser = null;
      await browser.close().catch(() => undefined);
    }
  }

  /**
   * Arm (or re-arm) the idle-eviction timer that closes the warm browser once
   * no parse has run for `this.browserIdleMs`.
   *
   * Only `parseInternal`'s `finally` may call this. That is what keeps the
   * invariant "no timer is armed while a parse is in flight" true: initBrowser()
   * clears the timer when a parse starts, and only the end of a parse re-arms
   * it. Arming from anywhere that is not behind the `inFlightParse` gate (a
   * health check, say) would schedule an eviction during a live parse.
   */
  private scheduleBrowserEviction(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      void this.closeBrowser();
    }, this.browserIdleMs);
    this.idleTimer.unref?.();
  }

  /**
   * Close the warm browser and cancel the idle timer.
   *
   * Public because this class is constructed with `new` from UrlParser, not by
   * the Nest container (its constructor throws without Azure config, and
   * UrlParser degrades gracefully on that). Nest lifecycle hooks therefore never
   * fire on this instance — UrlParser.onModuleDestroy() calls this instead.
   *
   * One-way: after this resolves, a concurrent initBrowser() that was mid-launch
   * discards its browser rather than installing an unowned one.
   */
  async shutdown(): Promise<void> {
    this.disposed = true;
    await this.closeBrowser();
    await this.egressProxy.close();
  }

  /**
   * Health check — reports on the warm browser without touching it.
   *
   * Pure observation by design: it never launches, never closes, and never
   * touches the idle timer. Each of those would be a bug here, because this
   * method is NOT behind the `inFlightParse` gate and so can run concurrently
   * with a parse:
   *
   *   - Closing would abort the in-flight parse outright.
   *   - Arming the idle timer would schedule an eviction *during* that parse.
   *     `initBrowser()` deliberately leaves no timer armed while a parse runs,
   *     and the parse hard timeout (90s) is longer than the default idle window
   *     (60s), so such a timer could fire and close the browser mid-parse.
   *   - Launching would make a liveness probe allocate ~150-250MB of Chromium,
   *     and a probe interval shorter than the idle window would keep cancelling
   *     eviction, pinning the browser forever.
   *
   * A worker with no warm browser is healthy — one launches on the next parse.
   */
  async healthCheck(): Promise<boolean> {
    return this.browser ? this.browser.isConnected() : true;
  }
}

