import { Injectable, Logger } from '@nestjs/common';
import { LLMProvider, GenerateOptions } from '../llm.interface';

/**
 * FakeV1Provider (`LLM_PROVIDER=fake`) — a v1-chain-aware offline provider.
 *
 * The legacy `mock` provider only emits canned Markdown, so the v1 generation
 * chain (whose first steps are `callJson`) throws in `parseJsonResponse`. This
 * provider makes the FULL chain runnable offline, deterministically and for
 * free: it detects which `prompts/v1/*.md` template produced the rendered
 * prompt, parses the interpolated JSON payloads back out of it, and answers
 * with schema-valid JSON (echoing real `profileExperienceId`s etc. so the
 * ID-preservation guards pass) or plausible Markdown.
 *
 * Two properties matter for the eval platform:
 *
 * 1. **Determinism.** All choices derive from a seeded PRNG (FNV-1a of
 *    prompt + model), so identical inputs give identical outputs across runs,
 *    machines and CI.
 * 2. **Model-tiered imperfection.** To make offline matrix runs meaningful,
 *    the fake injects *known* style violations (AI clichés, German hedging,
 *    verb-first bullets), occasional fabricated numbers, and occasional
 *    guard-breaking edits at rates that depend on the requested `model` —
 *    cheaper "tiers" misbehave more. The product's deterministic scorers and
 *    guarded passes then have real work to do, exactly like against a live
 *    model. The rates are synthetic; they exercise the pipeline, they do NOT
 *    predict real model quality.
 *
 * The existing `mock` provider stays untouched for its current callers.
 */

type StepId =
  | 'skill-selector'
  | 'job-facts'
  | 'resume-rewrite'
  | 'editor-resume'
  | 'resume-style-rewrite'
  | 'cover-letter'
  | 'editor-cover-letter'
  | 'keyword-weave'
  | 'style-rewrite'
  | 'ats-keywords'
  | 'unknown';

interface FakeProfileBlock {
  fullName?: string;
  summary?: string;
  skills?: Array<{ id?: string; name?: string; level?: string | null }>;
  experiences?: Array<{
    id?: string;
    title?: string;
    company?: string;
    description?: string;
    achievements?: string[];
  }>;
  projects?: Array<{
    id?: string;
    name?: string;
    description?: string;
    technologies?: string[];
    highlights?: string[];
  }>;
  education?: Array<{ id?: string; degree?: string; institution?: string }>;
  certificates?: Array<{ id?: string; name?: string; issuer?: string }>;
  languages?: Array<{ id?: string; name?: string; level?: string | null }>;
}

interface FakeJobBlock {
  title?: string;
  company?: string;
  fullText?: string;
  language?: string;
}

interface FakeTailoredBlock {
  target_role?: string;
  target_company?: string;
  selected_hard_skills?: string[];
  selected_experiences?: Array<{
    profileExperienceId?: string | null;
    title?: string;
    company?: string;
    summary?: string;
  }>;
  selected_projects?: Array<{
    profileProjectId?: string | null;
    name?: string;
    summary?: string;
  }>;
}

interface FakeRewrittenBlock {
  rewritten_summary?: string;
  rewritten_experiences?: Array<{
    profileExperienceId?: string;
    rewritten_description?: string;
    rewritten_achievements?: string[];
  }>;
  rewritten_projects?: Array<{
    profileProjectId?: string;
    rewritten_description?: string;
    rewritten_highlights?: string[];
  }>;
}

/** Misbehavior rates per synthetic model tier (probabilities in [0,1]). */
interface TierRates {
  /** Inject an AI cliché into generated prose. */
  cliche: number;
  /** Inject German hedging/Konjunktiv (DE only). */
  hedging: number;
  /** Inject an impact number that does NOT exist in the source data. */
  fabricate: number;
  /** German résumé bullets that open with a finite past-tense verb. */
  verbFirstBullet: number;
  /** Editor pass drops an ID / guts the payload (guard must catch it). */
  invalidEdit: number;
  /** Style-rewrite pass fails to actually fix the violations. */
  styleFixFails: number;
}

const TIERS: Array<{ match: RegExp; rates: TierRates }> = [
  {
    match: /nano/i,
    rates: { cliche: 0.85, hedging: 0.6, fabricate: 0.5, verbFirstBullet: 0.7, invalidEdit: 0.3, styleFixFails: 0.5 },
  },
  {
    match: /mini/i,
    rates: { cliche: 0.45, hedging: 0.3, fabricate: 0.22, verbFirstBullet: 0.35, invalidEdit: 0.08, styleFixFails: 0.2 },
  },
  {
    match: /gpt-5\.1|chat/i,
    rates: { cliche: 0.22, hedging: 0.12, fabricate: 0.08, verbFirstBullet: 0.12, invalidEdit: 0.02, styleFixFails: 0.05 },
  },
  {
    // gpt-4.1 baseline and anything unmatched: middling behavior.
    match: /.*/,
    rates: { cliche: 0.55, hedging: 0.4, fabricate: 0.3, verbFirstBullet: 0.5, invalidEdit: 0.05, styleFixFails: 0.25 },
  },
];

/** FNV-1a 32-bit hash for seeding. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — tiny deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Extract every parseable JSON object/array embedded in the rendered prompt. */
function extractJsonBlocks(prompt: string): unknown[] {
  const blocks: unknown[] = [];
  let i = 0;
  while (i < prompt.length) {
    const ch = prompt[i];
    if (ch !== '{' && ch !== '[') {
      i++;
      continue;
    }
    const end = findBalancedEnd(prompt, i);
    if (end === -1) {
      i++;
      continue;
    }
    const candidate = prompt.slice(i, end + 1);
    try {
      blocks.push(JSON.parse(candidate));
      i = end + 1;
      continue;
    } catch {
      i++;
    }
  }
  return blocks;
}

/** Find the index of the bracket closing the one at `start` (string-aware). */
function findBalancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** First fenced code block (``` … ```): the {{draft}} in editor/weave/style templates. */
function extractDraft(prompt: string): string {
  const match = prompt.match(/```(?!json)\w*\n([\s\S]*?)```/);
  return match ? match[1].trim() : '';
}

function detectLanguage(prompt: string): 'de' | 'en' {
  const marker = prompt.match(/\*\*Target Language:\*\*\s*(\w+)/i);
  if (marker) return marker[1].toLowerCase().startsWith('de') ? 'de' : 'en';
  return /[äöüß]|Sehr geehrte/.test(prompt) ? 'de' : 'en';
}

function detectStep(prompt: string): StepId {
  const head = prompt.slice(0, 200);
  if (head.includes('Resume Strategist and Profile Selector')) return 'skill-selector';
  if (head.includes('Job Posting Fact Extractor')) return 'job-facts';
  if (head.includes('Professional Resume Content Rewriter')) return 'resume-rewrite';
  if (head.includes('Senior Resume Content Editor')) return 'editor-resume';
  if (head.includes('Surgical Résumé Style Fixer')) return 'resume-style-rewrite';
  if (head.includes('Professional Cover Letter Writer')) return 'cover-letter';
  if (head.includes('Senior Cover Letter Editor')) return 'editor-cover-letter';
  if (head.includes('Surgical Keyword Weaver')) return 'keyword-weave';
  if (head.includes('ATS Keyword Extractor')) return 'ats-keywords';
  if (head.includes('Surgical Style Fixer')) return 'style-rewrite';
  return 'unknown';
}

/** Clichés/hedging that the deterministic linter is guaranteed to flag. */
const INJECT_CLICHE: Record<'de' | 'en', string[]> = {
  de: [
    'Ich bin begeistert von der Möglichkeit, mich hier einzubringen.',
    'Ich bin überzeugt, dass ich hervorragend ins Team passe.',
    'Ich arbeite leidenschaftlich an neuen Herausforderungen.',
  ],
  en: [
    'I am passionate about delivering value in this role.',
    'I have a proven track record of exceeding expectations.',
    'I am excited about the opportunity to join your team.',
  ],
};

const INJECT_HEDGING_DE = [
  'Ich würde mich freuen, von Ihnen zu hören.',
  'Ich möchte gerne Teil Ihres Teams werden.',
];

/** Replacements that remove a violation without introducing a new one. */
const VIOLATION_FIX: Record<string, { de: string; en: string }> = {
  'ich bin begeistert': { de: 'mich überzeugt die Aufgabe', en: 'the role convinces me' },
  'ich bin überzeugt': { de: 'meine Erfahrung zeigt', en: 'my experience shows' },
  leidenschaftlich: { de: 'konsequent', en: 'consistently' },
  'würde mich freuen': { de: 'freue mich', en: 'look forward' },
  'würde mich sehr freuen': { de: 'freue mich', en: 'look forward' },
  'würde ich mich freuen': { de: 'freue ich mich', en: 'I look forward' },
  'würde gerne': { de: 'werde', en: 'will' },
  'möchte gerne': { de: 'werde', en: 'will' },
  könnte: { de: 'kann', en: 'can' },
  hätte: { de: 'habe', en: 'have' },
  'passionate about': { de: 'konsequent bei', en: 'focused on' },
  'proven track record': { de: 'belegbare Ergebnisse', en: 'documented results' },
  'excited about the opportunity': { de: 'an der Aufgabe interessiert', en: 'interested in the role' },
  'i am excited about the opportunity': { de: 'die Aufgabe passt zu mir', en: 'the role fits my experience' },
  'i am confident that i': { de: 'meine Ergebnisse zeigen dass ich', en: 'my results show that I' },
  'successfully implemented': { de: 'eingeführt', en: 'introduced' },
  'developed and delivered': { de: 'aufgebaut', en: 'built' },
  'played a key role': { de: 'trug messbar bei', en: 'contributed measurably' },
  'erfolgreich umgesetzt': { de: 'umgesetzt', en: 'delivered' },
  'erfolgreich implementiert': { de: 'eingeführt', en: 'introduced' },
  'maßgeblich beigetragen': { de: 'messbar beigetragen', en: 'contributed measurably' },
  'signifikant beigetragen': { de: 'messbar beigetragen', en: 'contributed measurably' },
  'signifikant optimiert': { de: 'verbessert', en: 'improved' },
  'entwickelt und geliefert': { de: 'aufgebaut', en: 'built' },
  'konzipierte und implementierte': { de: 'Konzeption und Einführung von', en: 'designed and introduced' },
  'äußerst begeistert': { de: 'sehr interessiert', en: 'highly interested' },
  'begeistert von der möglichkeit': { de: 'an der Aufgabe interessiert', en: 'interested in the role' },
};

/** Verb-first German bullet openers → Nominalstil conversions. */
const VERB_TO_NOUN: Record<string, string> = {
  entwickelte: 'Entwicklung von',
  implementierte: 'Einführung von',
  optimierte: 'Optimierung von',
  leitete: 'Leitung von',
  betreute: 'Betreuung von',
  erstellte: 'Erstellung von',
  steigerte: 'Steigerung von',
  senkte: 'Reduktion von',
  koordinierte: 'Koordination von',
  organisierte: 'Organisation von',
};

const STOPWORDS = new Set(
  (
    'und oder der die das für mit bei auf aus von zu im ist sind wir sie ihre unsere dein deine ein eine einen einem einer als auch nach über sowie durch werden wird haben hat sich nicht mehr sehr the and for with from was were this that which you your our are have has will can not more than what who when they them their into able about'
  ).split(' '),
);

@Injectable()
export class FakeV1Provider implements LLMProvider {
  private readonly logger = new Logger(FakeV1Provider.name);

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || 'fake-default';
    const step = detectStep(prompt);
    const language = detectLanguage(prompt);
    const rand = mulberry32(fnv1a(`${model}::${prompt}`));
    const tier = TIERS.find((t) => t.match.test(model)) ?? TIERS[TIERS.length - 1];
    const rates = tier.rates;
    const blocks = extractJsonBlocks(prompt);

    const text = this.render(step, prompt, language, blocks, rand, rates);

    // Estimated, not reported: there is no upstream API. Enough for the eval's
    // relative cost comparison; `cachedTokens` is always 0 because nothing here
    // is cached.
    options?.onUsage?.({
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(text.length / 4),
      cachedTokens: 0,
    });

    return text;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private render(
    step: StepId,
    prompt: string,
    language: 'de' | 'en',
    blocks: unknown[],
    rand: () => number,
    rates: TierRates,
  ): string {
    switch (step) {
      case 'skill-selector':
        return this.renderSkillSelector(blocks, language);
      case 'job-facts':
        return this.renderJobFacts(blocks);
      case 'resume-rewrite':
        return this.renderResumeRewrite(blocks, language, rand, rates);
      case 'editor-resume':
        return this.renderResumeEditor(blocks, rand, rates);
      case 'resume-style-rewrite':
        return this.renderResumeStyleRewrite(blocks, language, rand, rates);
      case 'cover-letter':
        return this.renderCoverLetter(prompt, blocks, language, rand, rates);
      case 'editor-cover-letter':
        return this.renderCoverLetterEditor(prompt, rand);
      case 'keyword-weave':
        return this.renderKeywordWeave(prompt, blocks, language, rand, rates);
      case 'style-rewrite':
        return this.renderStyleRewrite(prompt, blocks, language, rand, rates);
      case 'ats-keywords':
        return this.renderAtsKeywords(blocks);
      default:
        return this.renderUnknown(prompt, language);
    }
  }

  // ---------------------------------------------------------------------
  // Block classification helpers
  // ---------------------------------------------------------------------

  private findProfile(blocks: unknown[]): FakeProfileBlock | null {
    for (const b of blocks) {
      if (isRecord(b) && Array.isArray(b.skills) && Array.isArray(b.experiences)) {
        return b as FakeProfileBlock;
      }
    }
    return null;
  }

  private findJob(blocks: unknown[]): FakeJobBlock | null {
    for (const b of blocks) {
      if (isRecord(b) && typeof b.fullText === 'string' && typeof b.title === 'string') {
        return b as FakeJobBlock;
      }
    }
    return null;
  }

  private findTailored(blocks: unknown[]): FakeTailoredBlock | null {
    for (const b of blocks) {
      if (isRecord(b) && Array.isArray(b.selected_experiences)) return b as FakeTailoredBlock;
    }
    return null;
  }

  private findRewritten(blocks: unknown[]): FakeRewrittenBlock | null {
    for (const b of blocks) {
      if (isRecord(b) && Array.isArray(b.rewritten_experiences)) return b as FakeRewrittenBlock;
    }
    return null;
  }

  private findStringArray(blocks: unknown[]): string[] {
    for (const b of blocks) {
      if (Array.isArray(b) && b.length > 0 && b.every((x) => typeof x === 'string')) {
        return b as string[];
      }
    }
    return [];
  }

  private pick<T>(rand: () => number, items: readonly T[]): T {
    return items[Math.floor(rand() * items.length)];
  }

  // ---------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------

  private renderSkillSelector(blocks: unknown[], language: 'de' | 'en'): string {
    const profile = this.findProfile(blocks) ?? {};
    const job = this.findJob(blocks) ?? {};
    const jobText = (job.fullText ?? '').toLowerCase();

    const skills = (profile.skills ?? []).map((s) => s.name ?? '').filter(Boolean);
    const matching = skills.filter((s) => jobText.includes(s.toLowerCase()));
    const rest = skills.filter((s) => !matching.includes(s));
    const hardSkills = [...matching, ...rest].slice(0, 10);

    const why =
      language === 'de'
        ? 'Direkt relevant für die ausgeschriebene Position.'
        : 'Directly relevant to the advertised position.';

    const experiences = (profile.experiences ?? []).slice(0, 4).map((e) => ({
      profileExperienceId: e.id ?? null,
      title: e.title ?? '',
      company: e.company ?? '',
      summary: (e.description ?? '').split(/(?<=[.!?])\s+/)[0] || (e.title ?? ''),
      why_relevant: why,
    }));

    const projects = (profile.projects ?? []).slice(0, 3).map((p) => ({
      profileProjectId: p.id ?? null,
      name: p.name ?? '',
      summary: (p.description ?? '').split(/(?<=[.!?])\s+/)[0] || (p.name ?? ''),
      why_relevant: why,
    }));

    const reasoning =
      language === 'de'
        ? `Das Profil deckt ${matching.length} der geforderten Kompetenzen ab. Auswahl fokussiert auf ${job.title ?? 'die Zielrolle'}.`
        : `The profile covers ${matching.length} of the required competencies. Selection focuses on ${job.title ?? 'the target role'}.`;

    return JSON.stringify({
      target_role: job.title ?? 'Unknown Role',
      target_company: job.company || 'Unknown Company',
      reasoning_short: reasoning,
      selected_hard_skills: hardSkills,
      selected_soft_skills: [],
      selected_tools: skills.slice(0, 4),
      selected_experiences: experiences,
      selected_projects: projects,
      selected_certificates: (profile.certificates ?? []).map((c) => ({
        profileCertificateId: c.id ?? null,
        name: c.name ?? '',
        issuer: c.issuer ?? '',
      })),
      selected_education: (profile.education ?? []).map((ed) => ({
        profileEducationId: ed.id ?? null,
        degree: ed.degree ?? '',
        institution: ed.institution ?? '',
      })),
      selected_languages: (profile.languages ?? []).map((l) => ({
        name: l.name ?? '',
        level: l.level ?? undefined,
      })),
    });
  }

  private renderJobFacts(blocks: unknown[]): string {
    const job = this.findJob(blocks) ?? {};
    const text = job.fullText ?? '';

    const contact = text.match(
      /(Frau|Herrn?)\s+((?:Dr\.|Prof\.)\s+)?([A-ZÄÖÜ][\p{L}]+(?:\s+[A-ZÄÖÜ][\p{L}]+)?)/u,
    );
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.length < 160);
    const specifics = sentences
      .filter((s) => (job.company ? s.includes(job.company) : /\d/.test(s)))
      .slice(0, 2)
      .map((s) => s.split(/\s+/).slice(0, 12).join(' '));

    return JSON.stringify({
      contact_name: contact ? `${contact[2] ?? ''}${contact[3]}`.trim() : '',
      contact_salutation: contact ? (contact[1].startsWith('Frau') ? 'Frau' : 'Herr') : '',
      company_specifics: specifics.length > 0 ? specifics : [],
      asks_salary: /gehaltsvorstellung|salary expectation/i.test(text),
      asks_start_date: /eintrittstermin|frühestmöglich|start date|earliest start/i.test(text),
    });
  }

  private renderResumeRewrite(
    blocks: unknown[],
    language: 'de' | 'en',
    rand: () => number,
    rates: TierRates,
  ): string {
    const tailored = this.findTailored(blocks) ?? {};
    const skills = tailored.selected_hard_skills ?? [];
    const role = tailored.target_role ?? (language === 'de' ? 'die Zielposition' : 'the target role');

    const bulletsFor = (summary: string, index: number): string[] => {
      const skill = skills[index % Math.max(skills.length, 1)] ?? (language === 'de' ? 'Fachwissen' : 'expertise');
      const skill2 = skills[(index + 1) % Math.max(skills.length, 1)] ?? skill;
      const grounded = summary.match(/\d[\d.,]*\s*(?:%|prozent)?/i)?.[0];
      const bullets: string[] = [];

      if (language === 'de') {
        bullets.push(`Aufbau und Weiterentwicklung von ${skill} im laufenden Betrieb`);
        bullets.push(
          grounded
            ? `Verbesserung zentraler Kennzahlen um ${grounded.trim()} durch ${skill2}`
            : `Standardisierung der Abläufe rund um ${skill2}`,
        );
        if (rand() < rates.verbFirstBullet) {
          bullets.push(`Entwickelte neue Arbeitsabläufe für ${skill2} im Tagesgeschäft`);
        }
        if (rand() < rates.fabricate) {
          bullets.push(`Steigerung der Teamproduktivität um ${17 + Math.floor(rand() * 4) * 10} %`);
        }
      } else {
        bullets.push(`Built and scaled ${skill} practices across the team`);
        bullets.push(
          grounded
            ? `Improved key metrics by ${grounded.trim()} through ${skill2}`
            : `Standardized day-to-day workflows around ${skill2}`,
        );
        if (rand() < rates.fabricate) {
          bullets.push(`Increased team throughput by ${17 + Math.floor(rand() * 4) * 10}%`);
        }
      }
      if (rand() < rates.cliche * 0.5) {
        bullets.push(
          language === 'de'
            ? `Erfolgreich umgesetzt: neue Standards für ${skill}`
            : `Successfully implemented new standards for ${skill}`,
        );
      }
      return bullets;
    };

    const experiences = (tailored.selected_experiences ?? [])
      .filter((e) => e.profileExperienceId)
      .map((e, i) => ({
        profileExperienceId: e.profileExperienceId as string,
        rewritten_description:
          language === 'de'
            ? `${e.summary || e.title || 'Verantwortung'} — ausgerichtet auf ${role}.`
            : `${e.summary || e.title || 'Responsibility'} — aligned with ${role}.`,
        rewritten_achievements: bulletsFor(e.summary ?? '', i),
      }));

    const projects = (tailored.selected_projects ?? [])
      .filter((p) => p.profileProjectId)
      .map((p) => ({
        profileProjectId: p.profileProjectId as string,
        rewritten_description:
          language === 'de'
            ? `${p.summary || p.name || 'Projekt'} mit klar messbarem Ergebnis.`
            : `${p.summary || p.name || 'Project'} with a clearly measurable outcome.`,
        rewritten_highlights: [
          language === 'de'
            ? `Einsatz von ${skills[0] ?? 'Kernkompetenzen'} von der Planung bis zum Abschluss`
            : `Applied ${skills[0] ?? 'core competencies'} from planning to delivery`,
        ],
      }));

    const summarySkills = skills.slice(0, 3).join(', ');
    let summary =
      language === 'de'
        ? `Erfahrene Fachkraft für ${role} mit nachweisbaren Ergebnissen in ${summarySkills || 'relevanten Bereichen'}. Verbindet operative Praxis mit messbaren Verbesserungen im Alltag.`
        : `Experienced professional for ${role} with verifiable results in ${summarySkills || 'relevant areas'}. Combines hands-on practice with measurable day-to-day improvements.`;
    if (rand() < rates.cliche * 0.6) {
      summary +=
        language === 'de'
          ? ' Leidenschaftlich in der täglichen Arbeit.'
          : ' Passionate about the daily work.';
    }

    return JSON.stringify({
      rewritten_summary: summary,
      rewritten_experiences: experiences,
      rewritten_projects: projects,
    });
  }

  private renderResumeEditor(blocks: unknown[], rand: () => number, rates: TierRates): string {
    const rewritten = this.findRewritten(blocks);
    if (!rewritten) return '{}';

    const edited: FakeRewrittenBlock = JSON.parse(JSON.stringify(rewritten));
    // Misbehave (tier-dependent): drop the first experience ID so the
    // ID-preservation guard rejects the edit and the pipeline falls back.
    if (rand() < rates.invalidEdit && (edited.rewritten_experiences?.length ?? 0) > 0) {
      edited.rewritten_experiences![0].profileExperienceId = 'hallucinated-id';
      return JSON.stringify(edited);
    }
    // Benign edit: tighten whitespace and ensure sentences end with a period.
    edited.rewritten_summary = (edited.rewritten_summary ?? '').replace(/\s+/g, ' ').trim();
    if (edited.rewritten_summary && !/[.!?]$/.test(edited.rewritten_summary)) {
      edited.rewritten_summary += '.';
    }
    for (const exp of edited.rewritten_experiences ?? []) {
      exp.rewritten_description = (exp.rewritten_description ?? '').replace(/\s+/g, ' ').trim();
    }
    return JSON.stringify(edited);
  }

  private fixViolationsInText(text: string, violations: string[], language: 'de' | 'en'): string {
    let out = text;
    for (const violation of violations) {
      const fix = VIOLATION_FIX[violation.toLowerCase()];
      const replacement = fix ? fix[language] : language === 'de' ? 'nachweislich' : 'demonstrably';
      const re = new RegExp(violation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, replacement);
    }
    return out;
  }

  private renderResumeStyleRewrite(
    blocks: unknown[],
    language: 'de' | 'en',
    rand: () => number,
    rates: TierRates,
  ): string {
    const rewritten = this.findRewritten(blocks);
    if (!rewritten) return '{}';
    const violations = this.findStringArray(blocks);

    // Tier-dependent failure: return the payload unchanged so the
    // strictly-cleaner guard rejects it (guard fallback becomes measurable).
    if (rand() < rates.styleFixFails) return JSON.stringify(rewritten);

    const edited: FakeRewrittenBlock = JSON.parse(JSON.stringify(rewritten));
    const fixText = (t: string | undefined): string =>
      this.fixViolationsInText(t ?? '', violations, language);
    const fixBullet = (bullet: string): string => {
      const cleaned = fixText(bullet);
      const firstWord = cleaned.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
      const noun = VERB_TO_NOUN[firstWord];
      if (language === 'de' && (noun || /ierte$/.test(firstWord))) {
        const rest = cleaned.trim().split(/\s+/).slice(1).join(' ');
        return `${noun ?? 'Umsetzung von'} ${rest}`;
      }
      return cleaned;
    };

    edited.rewritten_summary = fixText(edited.rewritten_summary);
    for (const exp of edited.rewritten_experiences ?? []) {
      exp.rewritten_description = fixText(exp.rewritten_description);
      exp.rewritten_achievements = (exp.rewritten_achievements ?? []).map(fixBullet);
    }
    for (const proj of edited.rewritten_projects ?? []) {
      proj.rewritten_description = fixText(proj.rewritten_description);
      proj.rewritten_highlights = (proj.rewritten_highlights ?? []).map(fixBullet);
    }
    return JSON.stringify(edited);
  }

  private renderCoverLetter(
    prompt: string,
    blocks: unknown[],
    language: 'de' | 'en',
    rand: () => number,
    rates: TierRates,
  ): string {
    const tailored = this.findTailored(blocks) ?? {};
    const salutation =
      prompt.match(/\*\*Salutation to use VERBATIM as the first line:\*\*\s*(.+)/)?.[1]?.trim() ??
      (language === 'de' ? 'Sehr geehrte Damen und Herren,' : 'Dear Hiring Manager,');
    const role = tailored.target_role ?? (language === 'de' ? 'die ausgeschriebene Stelle' : 'the advertised role');
    const company = tailored.target_company ?? (language === 'de' ? 'Ihr Unternehmen' : 'your company');
    const skills = (tailored.selected_hard_skills ?? []).slice(0, 3);
    const skillLine = skills.join(', ');
    const expSummary = tailored.selected_experiences?.[0]?.summary ?? '';
    const groundedNumber = expSummary.match(/\d[\d.,]*\s*(?:%|prozent)?/i)?.[0]?.trim();

    const paragraphs: string[] = [salutation, ''];

    if (language === 'de') {
      paragraphs.push(
        `mit großem Interesse habe ich Ihre Ausschreibung für die Position als ${role} bei ${company} gelesen. Meine Praxis in ${skillLine || 'den geforderten Bereichen'} passt unmittelbar zu Ihren Anforderungen.`,
      );
      paragraphs.push('');
      paragraphs.push(
        `In meiner aktuellen Tätigkeit verantworte ich genau die Aufgaben, die Sie beschreiben. ${expSummary} ${
          groundedNumber
            ? `Dabei habe ich Kennzahlen um ${groundedNumber} verbessert.`
            : 'Die Ergebnisse sind im Arbeitsalltag direkt messbar.'
        }`,
      );
      if (rand() < rates.fabricate) {
        paragraphs.push('');
        paragraphs.push(
          `Zusätzlich habe ich die Bearbeitungszeit im Team um ${23 + Math.floor(rand() * 3) * 11} % gesenkt und ein Budget von ${(1 + Math.floor(rand() * 4)) * 250}.000 € verantwortet.`,
        );
      }
      paragraphs.push('');
      if (rand() < rates.cliche) paragraphs.push(this.pick(rand, INJECT_CLICHE.de));
      if (rand() < rates.hedging) paragraphs.push(this.pick(rand, INJECT_HEDGING_DE));
      paragraphs.push(
        `Gern zeige ich Ihnen in einem persönlichen Gespräch, wie ich ${company} ab dem ersten Tag unterstütze.`,
      );
    } else {
      paragraphs.push(
        `your posting for the ${role} position at ${company} matches my background directly. My hands-on practice in ${skillLine || 'the required areas'} maps to the responsibilities you describe.`,
      );
      paragraphs.push('');
      paragraphs.push(
        `In my current role I own exactly this kind of work. ${expSummary} ${
          groundedNumber
            ? `I improved key metrics by ${groundedNumber}.`
            : 'The results are directly measurable in day-to-day operations.'
        }`,
      );
      if (rand() < rates.fabricate) {
        paragraphs.push('');
        paragraphs.push(
          `I also cut processing time by ${23 + Math.floor(rand() * 3) * 11}% and managed a budget of €${(1 + Math.floor(rand() * 4)) * 250},000.`,
        );
      }
      paragraphs.push('');
      if (rand() < rates.cliche) paragraphs.push(this.pick(rand, INJECT_CLICHE.en));
      paragraphs.push(
        `I would welcome the chance to show how I can support ${company} from day one.`,
      );
    }

    return paragraphs.join('\n');
  }

  private renderCoverLetterEditor(prompt: string, rand: () => number): string {
    const draft = extractDraft(prompt);
    if (!draft) return '';
    // The fake editor is benign: it tightens whitespace and occasionally
    // removes one cliché sentence (a mild, realistic improvement).
    let edited = draft.replace(/[ \t]+/g, ' ');
    if (rand() < 0.5) {
      const allClicheSentences = [...INJECT_CLICHE.de, ...INJECT_CLICHE.en];
      for (const sentence of allClicheSentences) {
        if (edited.includes(sentence)) {
          edited = edited.replace(sentence, '').replace(/\n{3,}/g, '\n\n');
          break;
        }
      }
    }
    return edited.trim();
  }

  private renderKeywordWeave(
    prompt: string,
    blocks: unknown[],
    language: 'de' | 'en',
    rand: () => number,
    rates: TierRates,
  ): string {
    const draft = extractDraft(prompt);
    const keywords = this.findStringArray(blocks);
    if (!draft) return '';
    // Tier-dependent failure: return a gutted draft so the length guard trips.
    if (rand() < rates.styleFixFails * 0.5) return draft.slice(0, Math.floor(draft.length * 0.4));
    if (keywords.length === 0) return draft;

    const list =
      keywords.length > 1
        ? `${keywords.slice(0, -1).join(', ')} ${language === 'de' ? 'und' : 'and'} ${keywords[keywords.length - 1]}`
        : keywords[0];
    const weaveSentence =
      language === 'de'
        ? `Meine Praxis in ${list} setze ich dabei vom ersten Tag an ein.`
        : `I bring hands-on practice in ${list} from day one.`;

    // Insert before the final paragraph so the letter still closes naturally.
    const parts = draft.split('\n\n');
    if (parts.length > 1) {
      parts.splice(parts.length - 1, 0, weaveSentence);
      return parts.join('\n\n');
    }
    return `${draft}\n\n${weaveSentence}`;
  }

  private renderStyleRewrite(
    prompt: string,
    blocks: unknown[],
    language: 'de' | 'en',
    rand: () => number,
    rates: TierRates,
  ): string {
    const draft = extractDraft(prompt);
    const violations = this.findStringArray(blocks);
    if (!draft) return '';
    // Tier-dependent failure: return the draft unchanged (guard rejects).
    if (rand() < rates.styleFixFails) return draft;
    return this.fixViolationsInText(draft, violations, language);
  }

  private renderAtsKeywords(blocks: unknown[]): string {
    const job = this.findJob(blocks) ?? {};
    const text = job.fullText ?? '';

    // Deterministic keyword mining: frequency-ranked distinctive words.
    const counts = new Map<string, { word: string; count: number }>();
    for (const raw of text.split(/[^\p{L}\p{N}+#.-]+/u)) {
      const word = raw.replace(/^[.-]+|[.-]+$/g, '');
      if (word.length < 4 || word.length > 30) continue;
      const key = word.toLowerCase();
      if (STOPWORDS.has(key) || /^\d+$/.test(key)) continue;
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { word, count: 1 });
    }
    const ranked = [...counts.values()]
      .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
      .slice(0, 12);

    const hardSkills = ranked.map((entry, i) => ({
      keyword: entry.word,
      priority: i < 4 ? 1 : i < 9 ? 2 : 3,
    }));

    return JSON.stringify({ hard_skills: hardSkills, soft_skills: [] });
  }

  private renderUnknown(prompt: string, language: 'de' | 'en'): string {
    // Generic fallback for non-chain templates: honor a JSON request shape
    // minimally, otherwise return a short neutral paragraph.
    if (/\bjson\b/i.test(prompt)) return '{}';
    return language === 'de'
      ? 'Deterministische Offline-Antwort des Fake-Providers.'
      : 'Deterministic offline response from the fake provider.';
  }
}
