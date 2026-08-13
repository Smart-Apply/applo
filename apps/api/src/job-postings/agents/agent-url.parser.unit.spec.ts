import { chromium, type Browser } from 'playwright';
import { AgentUrlParser, resolveBrowserIdleMs } from './agent-url.parser';
import { UrlParser } from '../parsers/url.parser';

const AZURE_KEYS = [
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_DEPLOYMENT_NAME',
  'AGENT_BROWSER_IDLE_MS',
] as const;

// vitest runs with `singleFork: true`, so every spec file shares one
// process.env. Snapshot and restore rather than delete, or a developer with
// AZURE_OPENAI_* exported has them silently unset for later suites.
let envSnapshot: Partial<Record<(typeof AZURE_KEYS)[number], string | undefined>>;

beforeEach(() => {
  envSnapshot = {};
  for (const key of AZURE_KEYS) {
    envSnapshot[key] = process.env[key];
  }
  process.env.AZURE_OPENAI_ENDPOINT = 'https://example.invalid';
  process.env.AZURE_OPENAI_API_KEY = 'test-key';
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME = 'gpt-4.1';
  delete process.env.AGENT_BROWSER_IDLE_MS;
});

afterEach(() => {
  for (const key of AZURE_KEYS) {
    const previous = envSnapshot[key];
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
});

describe('resolveBrowserIdleMs', () => {
  it.each([
    [undefined, 60_000],
    ['', 60_000],
    ['   ', 60_000],
    ['5000', 5_000],
    ['300000', 300_000],
    ['abc', 60_000],
    ['-1', 60_000],
    ['0', 60_000],
    ['1.5', 60_000],
    ['99999999', 600_000],
    // Number() would accept these; the digit-only guard must not.
    ['0x10', 60_000],
    ['1e3', 60_000],
    // Below the floor: clamped up, so the warm pool cannot be silently disabled.
    ['1', 1_000],
  ])('resolves %j to %j', (raw, expected) => {
    expect(resolveBrowserIdleMs(raw)).toBe(expected);
  });

  it('is what the constructor uses for the eviction window', () => {
    process.env.AGENT_BROWSER_IDLE_MS = '5000';
    const parser = new AgentUrlParser();
    expect((parser as unknown as { browserIdleMs: number }).browserIdleMs).toBe(5_000);
  });
});

describe('AgentUrlParser lifecycle', () => {
  type ParserInternals = {
    browser: Browser | null;
    idleTimer: NodeJS.Timeout | null;
    scheduleBrowserEviction: () => void;
  };

  function createFakeBrowser(connected = true): Browser & { close: ReturnType<typeof vi.fn> } {
    return {
      isConnected: () => connected,
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as Browser & { close: ReturnType<typeof vi.fn> };
  }

  it('shutdown() closes the warm browser and clears the instance field', async () => {
    const parser = new AgentUrlParser();
    const fakeBrowser = createFakeBrowser();
    (parser as unknown as ParserInternals).browser = fakeBrowser;

    await parser.shutdown();

    expect(fakeBrowser.close).toHaveBeenCalledOnce();
    expect((parser as unknown as ParserInternals).browser).toBeNull();
  });

  it('shutdown() cancels a pending eviction timer', async () => {
    const parser = new AgentUrlParser();
    (parser as unknown as ParserInternals).browser = createFakeBrowser();
    (parser as unknown as ParserInternals).scheduleBrowserEviction();
    expect((parser as unknown as ParserInternals).idleTimer).not.toBeNull();

    await parser.shutdown();

    expect((parser as unknown as ParserInternals).idleTimer).toBeNull();
  });

  it('reports healthy when no browser is warm', async () => {
    const parser = new AgentUrlParser();
    await expect(parser.healthCheck()).resolves.toBe(true);
  });

  it('reports unhealthy when the warm browser is disconnected', async () => {
    const parser = new AgentUrlParser();
    (parser as unknown as ParserInternals).browser = createFakeBrowser(false);

    await expect(parser.healthCheck()).resolves.toBe(false);
  });

  // Regression: healthCheck() is NOT behind the `inFlightParse` gate, so it can
  // run during a parse. An earlier revision re-armed the eviction timer in a
  // `finally`; because the parse hard timeout (90s) exceeds the default idle
  // window (60s), that timer could fire mid-parse and close the browser under
  // the running request. healthCheck() must leave the timer untouched.
  it('healthCheck() never arms an eviction timer or closes the browser', async () => {
    vi.useFakeTimers();
    try {
      const parser = new AgentUrlParser();
      const fakeBrowser = createFakeBrowser();
      const internals = parser as unknown as ParserInternals;
      internals.browser = fakeBrowser;
      // Mirror a parse in flight: initBrowser() has cleared the idle timer.
      internals.idleTimer = null;

      await expect(parser.healthCheck()).resolves.toBe(true);

      expect(internals.idleTimer).toBeNull();

      // Advance well past the longest permitted idle window.
      await vi.advanceTimersByTimeAsync(700_000);

      expect(fakeBrowser.close).not.toHaveBeenCalled();
      expect(internals.browser).toBe(fakeBrowser);
    } finally {
      vi.useRealTimers();
    }
  });

  // Regression: closeBrowser() only sees `this.browser`, which initBrowser()
  // assigns *after* awaiting the launch. A shutdown() landing inside that window
  // used to no-op, then the launch resolved and installed a browser that nothing
  // would ever close. Drives the real initBrowser() against a stalled launch.
  it('discards a browser whose launch finished after shutdown()', async () => {
    const parser = new AgentUrlParser();
    const orphan = createFakeBrowser();
    const internals = parser as unknown as {
      initBrowser: () => Promise<void>;
      browser: Browser | null;
    };

    let finishLaunch: (browser: Browser) => void = () => undefined;
    const launchSpy = vi
      .spyOn(chromium, 'launch')
      .mockReturnValue(
        new Promise<Browser>((resolve) => {
          finishLaunch = resolve;
        }),
      );

    try {
      const launching = internals.initBrowser();
      // shutdown() lands while chromium.launch() is still pending.
      await parser.shutdown();
      finishLaunch(orphan);

      await expect(launching).rejects.toThrow(/shut down/i);
      expect(orphan.close).toHaveBeenCalledOnce();
      expect(internals.browser).toBeNull();
    } finally {
      launchSpy.mockRestore();
    }
  });
});

describe('UrlParser lifecycle', () => {
  it('onModuleDestroy() delegates to the agent parser shutdown', async () => {
    const urlParser = new UrlParser();
    const shutdown = vi.fn().mockResolvedValue(undefined);
    (urlParser as unknown as { agentParser: { shutdown: typeof shutdown } }).agentParser = {
      shutdown,
    };

    await urlParser.onModuleDestroy();

    expect(shutdown).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy() is a no-op when the agent parser is disabled', async () => {
    const urlParser = new UrlParser();
    (urlParser as unknown as { agentParser: undefined }).agentParser = undefined;

    await expect(urlParser.onModuleDestroy()).resolves.toBeUndefined();
  });
});
