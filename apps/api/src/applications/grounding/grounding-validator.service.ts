import { Injectable, Logger } from '@nestjs/common';
import type { ProfileWithRelations } from '../resume-template.util';

/**
 * A single numeric claim found in generated output.
 */
export interface GroundingFinding {
  /** The token exactly as it appeared in the generated text (e.g. "40%"). */
  value: string;
  /** Digits-only normalized form used for matching (e.g. "40"). */
  normalized: string;
  /** Short surrounding snippet for log context. */
  context: string;
}

/**
 * Result of a grounding check.
 */
export interface GroundingReport {
  /** True when every impactful numeric claim traces back to the profile. */
  grounded: boolean;
  /** How many distinct impact numbers were checked. */
  totalChecked: number;
  /** Numbers that do NOT appear anywhere in the source profile. */
  unsupported: GroundingFinding[];
  /** 0-100 share of checked claims that are grounded (100 when none checked). */
  score: number;
}

/**
 * GroundingValidatorService — deterministic anti-hallucination guard (#7).
 *
 * Pure code, NO LLM call. Verifies that the *impactful numbers* the model put
 * into the generated resume / cover letter (percentages, currency amounts,
 * magnitudes like "2k", and large counts) actually exist somewhere in the
 * candidate's source profile. Fabricated metrics are the single most damaging
 * (and legally risky) failure mode of AI-written applications, so we surface
 * them.
 *
 * Design notes:
 * - **Non-destructive.** This validator only *reports*; callers decide what to
 *   do (today: log a warning for telemetry). Stripping numbers out of prose
 *   would mangle sentences, so we deliberately don't.
 * - **Precision over recall.** We only check high-signal "impact" numbers and
 *   treat the profile corpus leniently (any matching digit token grounds a
 *   claim). Small standalone integers (e.g. "5 years", derivable from dates)
 *   are intentionally NOT checked to avoid false positives.
 * - Handles both resume shapes: JSON (the `createWithGeneration` path) and
 *   Markdown/plain text (the `generateWithSinglePipeline` path).
 */
@Injectable()
export class GroundingValidatorService {
  private readonly logger = new Logger(GroundingValidatorService.name);

  /**
   * JSON keys whose values are free-text prose written by the LLM. We only
   * extract numbers from these — NOT from the whole serialized resume, which
   * also contains contact info (phone), ISO date strings, template ids and
   * other structural numbers that would otherwise be flagged as fabricated.
   */
  private static readonly PROSE_KEYS = new Set([
    'summary',
    'description',
    'achievements',
    'highlights',
    'bullets',
    'responsibilities',
    'content',
  ]);

  /**
   * Validate generated output against the source profile.
   */
  validate(
    input: { resume?: string | null; coverLetter?: string | null },
    profile: ProfileWithRelations,
  ): GroundingReport {
    const corpusNumbers = this.extractCorpusNumberSet(this.buildProfileCorpus(profile));
    const text = this.extractGeneratedText(input.resume, input.coverLetter);
    const claims = this.extractImpactClaims(text);

    const unsupported = claims.filter((claim) => !corpusNumbers.has(claim.normalized));
    const totalChecked = claims.length;
    const groundedCount = totalChecked - unsupported.length;
    const score = totalChecked === 0 ? 100 : Math.round((groundedCount / totalChecked) * 100);

    return { grounded: unsupported.length === 0, totalChecked, unsupported, score };
  }

  // ---------------------------------------------------------------------------
  // Source-profile corpus
  // ---------------------------------------------------------------------------

  /**
   * Build a single text blob of all substantive profile content. Contact
   * digits (phone, postal code) are intentionally excluded so a fabricated
   * metric cannot be "grounded" by coincidentally matching a phone number.
   */
  private buildProfileCorpus(profile: ProfileWithRelations): string {
    const parts: string[] = [];

    const push = (value: unknown): void => {
      if (typeof value === 'string' && value.trim()) parts.push(value);
    };
    const pushYear = (value: unknown): void => {
      if (value == null) return;
      if (typeof value === 'number') {
        parts.push(String(value));
        return;
      }
      const year = new Date(value as string | Date).getFullYear();
      if (!Number.isNaN(year)) parts.push(String(year));
    };

    push(profile.summary);

    for (const exp of profile.experiences ?? []) {
      push(exp.title);
      push(exp.company);
      push(exp.description);
      (exp.achievements ?? []).forEach(push);
      pushYear(exp.startDate);
      pushYear(exp.endDate);
    }

    for (const project of profile.projects ?? []) {
      push(project.name);
      push(project.description);
      (project.technologies ?? []).forEach(push);
      (project.highlights ?? []).forEach(push);
    }

    for (const edu of profile.education ?? []) {
      push(edu.degree);
      push(edu.institution);
      pushYear((edu as { startYear?: unknown }).startYear);
      pushYear((edu as { endYear?: unknown }).endYear);
    }

    for (const cert of profile.certificates ?? []) {
      push(cert.name);
      push(cert.issuer);
    }

    for (const skill of profile.skills ?? []) push(skill.name);
    for (const lang of profile.languages ?? []) {
      push(lang.name);
      push(lang.level);
    }

    return parts.join('  ');
  }

  /**
   * Set of every digits-only number token appearing in the profile corpus.
   */
  private extractCorpusNumberSet(corpus: string): Set<string> {
    const set = new Set<string>();
    const matches = corpus.match(/\d[\d.,]*/g) ?? [];
    for (const match of matches) {
      const normalized = this.normalizeNumber(match);
      if (normalized) set.add(normalized);
    }
    return set;
  }

  // ---------------------------------------------------------------------------
  // Generated-output text extraction
  // ---------------------------------------------------------------------------

  private extractGeneratedText(
    resume: string | null | undefined,
    coverLetter: string | null | undefined,
  ): string {
    const parts: string[] = [];
    if (coverLetter) parts.push(this.stripHtml(coverLetter));
    if (resume) parts.push(this.extractTextFromResume(resume));
    return parts.join('\n');
  }

  /**
   * Resume content can be persisted as JSON (editor format) or Markdown.
   * For JSON we walk ONLY prose fields (summary / description / achievements /
   * highlights) so contact digits, ISO date strings and timestamps don't leak
   * into the number set. For Markdown we treat the whole thing as prose and
   * rely on the impact-claim filters to reject dates/phones.
   */
  private extractTextFromResume(resume: string): string {
    const trimmed = resume.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        const collected: string[] = [];
        this.collectProseStrings(parsed, collected, false);
        return collected.join('\n');
      } catch {
        // Not valid JSON after all — fall through to plain-text handling.
      }
    }

    return this.stripHtml(trimmed);
  }

  /**
   * Walk a parsed JSON tree, collecting string values that live under a prose
   * key (directly or nested). Everything else (contact, dates, ids) is skipped.
   */
  private collectProseStrings(node: unknown, out: string[], inProse: boolean): void {
    if (node == null) return;
    if (typeof node === 'string') {
      if (inProse) out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => this.collectProseStrings(child, out, inProse));
      return;
    }
    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        const keyIsProse = GroundingValidatorService.PROSE_KEYS.has(key.toLowerCase());
        this.collectProseStrings(value, out, inProse || keyIsProse);
      }
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ');
  }

  // ---------------------------------------------------------------------------
  // Impact-number extraction
  // ---------------------------------------------------------------------------

  /**
   * Extract the high-signal "impact" numbers worth grounding: percentages,
   * currency amounts, magnitude-suffixed numbers (2k, 3 Mio, 5M), "+" counts,
   * and any plain number with 3+ digits (>= 100). Small standalone integers
   * are skipped on purpose. De-duplicated by normalized value.
   */
  private extractImpactClaims(text: string): GroundingFinding[] {
    const found = new Map<string, GroundingFinding>();

    const add = (value: string, index: number): void => {
      const normalized = this.normalizeNumber(value);
      if (!normalized) return;
      if (!found.has(normalized)) {
        found.set(normalized, {
          value: value.trim(),
          normalized,
          context: this.snippet(text, index, value.length),
        });
      }
    };

    // Percentages — checked regardless of length (e.g. "40%").
    this.collectMatches(text, /\d+(?:[.,]\d+)?\s*%/g, add);
    // Currency amounts.
    this.collectMatches(
      text,
      /(?:[€$£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|EUR|USD|GBP|Euro|Dollar))/gi,
      add,
    );
    // Magnitude suffixes (2k, 3 Mio, 1.5M, 4 Millionen).
    this.collectMatches(
      text,
      /\d[\d.,]*\s?\+?\s?(?:k|m|mio\.?|mrd\.?|million(?:en)?|milliarden?|tsd\.?|tausend)\b/gi,
      add,
    );
    // "+"-suffixed counts (10.000+).
    this.collectMatches(text, /\d[\d.,]*\+/g, add);
    // Plain numbers — only a plausible "metric" range, to keep out calendar
    // years, phone numbers, postal codes, ids and ISO-date fragments that
    // would otherwise masquerade as fabricated claims.
    this.collectMatches(text, /\d[\d.,]*/g, (value, index) => {
      const n = this.normalizeNumber(value);
      // 3–6 significant digits (100–999,999); strong-signal numbers
      // (%, currency, magnitudes) are handled by the buckets above.
      if (n.length < 3 || n.length > 6) return;
      // Leading zero → formatting artifact (e.g. an ISO "00.000" time), not a metric.
      if (n.startsWith('0')) return;
      // 4-digit calendar year → a date, not an impact metric.
      if (n.length === 4) {
        const year = Number(n);
        if (year >= 1900 && year <= 2099) return;
      }
      add(value, index);
    });

    return Array.from(found.values());
  }

  private collectMatches(
    text: string,
    re: RegExp,
    cb: (value: string, index: number) => void,
  ): void {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      cb(match[0], match.index);
      if (match.index === re.lastIndex) re.lastIndex++; // guard against zero-length matches
    }
  }

  private normalizeNumber(token: string): string {
    return token.replace(/\D/g, '');
  }

  private snippet(text: string, index: number, length: number): string {
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + length + 30);
    return text.slice(start, end).replace(/\s+/g, ' ').trim();
  }
}
