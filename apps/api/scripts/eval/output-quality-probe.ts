/**
 * Deterministic output-quality probe (issue #572).
 *
 * Measures the *instruments* the generation pipeline relies on — the grounding
 * validator, the style linter, the ATS keyword matcher, the length governor and
 * the cover-letter PDF template data — against the committed eval fixtures.
 * Runs entirely offline: no LLM call, no database, no network, no cost.
 *
 * Why this exists: every quality claim about generated documents is only as
 * good as the checker that measures it. Before spending money on a full paid
 * eval run, this script quantifies how much of a realistic document each
 * checker can actually see. The findings it produces are written up in
 * `docs/implementation/LLM_OUTPUT_QUALITY_REVIEW_2026-08.md`.
 *
 * Usage (from apps/api):
 *   pnpm run eval:probe
 *   pnpm run eval:probe -- --fail-on-gaps   # exit 1 while any gap remains
 *   pnpm run eval:probe -- --no-pdf         # skip the PDF render section
 *
 * Each probe prints OK (the checker behaves as its own documentation claims)
 * or GAP (it does not). A follow-up fix should flip its probe from GAP to OK.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createElement } from 'react';
import { PDFParse } from 'pdf-parse';
import { loadReactPdf } from '../../src/pdf-v2/react-pdf-loader';
import { ClassicAtsFactory } from '../../src/pdf-v2/templates/classic-ats';
import { GroundingValidatorService } from '../../src/applications/grounding/grounding-validator.service';
import {
  lintGeneratedStyle,
  lintCoverLetterLength,
  extractSalutationLine,
} from '../../src/applications/style-lint.util';
import {
  matchAtsKeywordsToProfile,
  selectKeywordsToWeave,
  computePriority1Coverage,
  type AtsHardSkill,
} from '../../src/applications/keyword-coverage.util';
import { buildSalutation } from '../../src/applications/job-facts.util';
import { hydrateProfile, type EvalFixture } from './fixture.types';
import type { ProfileWithRelations } from '../../src/applications/resume-template.util';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');
const PROMPT_DIR = path.join(__dirname, '..', '..', 'prompts', 'v1');

const grounding = new GroundingValidatorService();

interface ProbeResult {
  id: string;
  title: string;
  expected: string;
  actual: string;
  verdict: 'OK' | 'GAP';
}

const results: ProbeResult[] = [];

function probe(title: string, expected: string, actual: string, verdict: 'OK' | 'GAP'): void {
  const id = `P${String(results.length + 1).padStart(2, '0')}`;
  results.push({ id, title, expected, actual, verdict });
  console.log(`[${id}] ${title}`);
  console.log(`      expected: ${expected}`);
  console.log(`      actual:   ${actual}`);
  console.log(`      => ${verdict}\n`);
}

function section(title: string): void {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}\n`);
}

/** Wilson score interval — appropriate for the small pooled counts here. */
function wilson(k: number, n: number): string {
  if (n === 0) return 'n/a';
  const z = 1.96;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  const lo = ((centre - spread) / denom) * 100;
  const hi = ((centre + spread) / denom) * 100;
  return `${lo.toFixed(0)}–${hi.toFixed(0)} %`;
}

function loadFixtures(): EvalFixture[] {
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, f), 'utf8')) as EvalFixture);
}

function fixtureById(fixtures: EvalFixture[], id: string): EvalFixture {
  const found = fixtures.find((f) => f.id === id);
  if (!found) throw new Error(`fixture ${id} not found`);
  return found;
}

/** A profile with nothing in it — makes the validator report what it *sees*. */
function emptyProfile(): ProfileWithRelations {
  return hydrateProfile({
    id: 'empty',
    profession: 'n/a',
    language: 'de',
    profile: {
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.c',
      summary: '',
      skills: [],
      experiences: [],
    },
    jobPosting: { title: 'x', language: 'de', fullText: '' },
  });
}

/** Wrap prose as the résumé JSON the grounding validator scans. */
function asResumeJson(texts: string[]): string {
  return JSON.stringify({ experiences: texts.map((t) => ({ achievements: [t] })) });
}

/** Every prose string a generated résumé would draw from. */
function profileProse(fixture: EvalFixture): string[] {
  const texts: string[] = [];
  if (fixture.profile.summary) texts.push(fixture.profile.summary);
  for (const exp of fixture.profile.experiences) {
    if (exp.description) texts.push(exp.description);
    for (const achievement of exp.achievements ?? []) texts.push(achievement);
  }
  return texts;
}

// ───────────────────────── Section A — instrument coverage ────────────────────

/**
 * A1: how many of the impact claims that actually occur in realistic CV prose
 * does `extractImpactClaims` even look at? Reference set = numbers carrying a
 * unit or magnitude word (percent, currency, Mio./thousand …), i.e. claims no
 * reviewer would call ambiguous. Both sides are de-duplicated by the
 * validator's own normalisation so the comparison is like-for-like.
 */
function measureGroundingRecall(fixtures: EvalFixture[]): void {
  const REFERENCE_PATTERNS = [
    /\d+(?:[.,]\d+)?\s*(?:%|prozent(?:punkte)?|percent(?:age points?)?)/gi,
    /(?:[€$£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|eur|usd|gbp|chf|euro|dollar))/gi,
    /\d[\d.,]*\s?\+?\s?(?:k\b|m\b|mio\.?|mrd\.?|million(?:en)?|milliarden?|tsd\.?|tausend|thousand|billion)/gi,
  ];
  const normalize = (token: string): string => token.replace(/\D/g, '');
  const empty = emptyProfile();

  let refTotal = 0;
  let hitTotal = 0;
  const perLanguage: Record<string, { ref: number; hit: number }> = {
    de: { ref: 0, hit: 0 },
    en: { ref: 0, hit: 0 },
  };
  const missedExamples: string[] = [];

  for (const fixture of fixtures) {
    const prose = profileProse(fixture);
    const joined = prose.join('\n');

    const reference = new Map<string, string>();
    for (const pattern of REFERENCE_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(joined)) !== null) {
        const key = normalize(match[0]);
        if (key && !reference.has(key)) reference.set(key, match[0].trim());
      }
    }

    const seen = new Set(
      grounding
        .validate({ resume: asResumeJson(prose) }, empty)
        .unsupported.map((finding) => finding.normalized),
    );

    for (const [key, raw] of reference) {
      if (seen.has(key)) hitTotal++;
      else if (missedExamples.length < 6) missedExamples.push(`${fixture.id}: "${raw}"`);
    }
    const hits = [...reference.keys()].filter((key) => seen.has(key)).length;
    refTotal += reference.size;
    perLanguage[fixture.language].ref += reference.size;
    perLanguage[fixture.language].hit += hits;
  }

  const rate = refTotal ? Math.round((hitTotal / refTotal) * 100) : 0;
  console.log(`Reference impact claims in fixture CV prose : ${refTotal}`);
  console.log(`Seen by GroundingValidator.extractImpactClaims: ${hitTotal}`);
  console.log(`Detector recall: ${rate} % (95 % Wilson CI ${wilson(hitTotal, refTotal)})`);
  for (const lang of ['de', 'en']) {
    const { ref, hit } = perLanguage[lang];
    const pct = ref ? Math.round((hit / ref) * 100) : 0;
    console.log(`  ${lang.toUpperCase()}: ${hit}/${ref} = ${pct} % (${wilson(hit, ref)})`);
  }
  console.log(`Examples the detector never inspects: ${missedExamples.join(', ')}\n`);

  probe(
    'grounding detector recall over the 24 committed fixtures (pooled distinct claims)',
    '≥ 90 % of unambiguous impact claims inspected',
    `${hitTotal}/${refTotal} = ${rate} % (95 % CI ${wilson(hitTotal, refTotal)})`,
    rate >= 90 ? 'OK' : 'GAP',
  );
}

/**
 * A2: the v1 prompts list phrases the model must never write. Can the
 * deterministic linter — the thing that triggers the guarded style-rewrite
 * pass — actually detect them?
 */
function measureStyleCoverage(): void {
  const rows: { phrase: string; lang: 'de' | 'en'; detected: boolean }[] = [];

  for (const file of ['cover-letter.md', 'resume-rewrite.md']) {
    const md = fs.readFileSync(path.join(PROMPT_DIR, file), 'utf8');
    const start = md.indexOf('## FORBIDDEN AI-STYLE PHRASES');
    if (start === -1) continue;
    const after = md.slice(start + 5);
    const end = after.indexOf('\n## ');
    const block = end === -1 ? md.slice(start) : md.slice(start, start + 5 + end);

    let lang: 'de' | 'en' = 'de';
    for (const line of block.split('\n')) {
      if (/### German/i.test(line)) lang = 'de';
      else if (/### English/i.test(line)) lang = 'en';
      const match = line.match(/^-\s*❌\s*"([^"]+)"/);
      if (!match) continue;
      const phrase = match[1].replace(/\.\.\.$/, '').trim();
      const sentence =
        lang === 'de' ? `${phrase} das Projekt im Team.` : `${phrase} the project with the team.`;
      const report = lintGeneratedStyle(sentence, lang);
      rows.push({ phrase, lang, detected: report.aiPhrases.length + report.hedging.length > 0 });
    }
  }

  const detected = rows.filter((r) => r.detected).length;
  const missed = rows.filter((r) => !r.detected).map((r) => `[${r.lang}] "${r.phrase}"`);
  console.log(`Phrases the v1 prompts explicitly forbid : ${rows.length}`);
  console.log(`Detected by lintGeneratedStyle           : ${detected}`);
  if (missed.length) console.log(`Undetected                               : ${missed.join(', ')}`);
  console.log('');

  probe(
    "style linter vs the v1 prompts' own forbidden-phrase lists",
    'every forbidden phrase is detectable, so the guarded rewrite can fix it',
    `${detected}/${rows.length} detected (95 % CI ${wilson(detected, rows.length)})${
      missed.length ? ` — missed: ${missed.join(', ')}` : ''
    }`,
    detected === rows.length ? 'OK' : 'GAP',
  );
}

// ───────────────────────── Section B — targeted probes ────────────────────────

function probeGrounding(fixtures: EvalFixture[]): void {
  const healthcare = fixtureById(fixtures, 'healthcare-de');
  const healthcareProfile = hydrateProfile(healthcare);
  const sales = fixtureById(fixtures, 'sales-de');
  const salesProfile = hydrateProfile(sales);

  {
    const sign = grounding.validate(
      { coverLetter: '<p>Ich senkte die Fluktuation um 42 %.</p>' },
      healthcareProfile,
      healthcare.jobPosting.fullText,
    );
    const word = grounding.validate(
      { coverLetter: '<p>Ich senkte die Fluktuation um 42 Prozent.</p>' },
      healthcareProfile,
      healthcare.jobPosting.fullText,
    );
    const english = grounding.validate(
      { coverLetter: '<p>I cut turnover by 42 percent and lifted retention 12 percentage points.</p>' },
      healthcareProfile,
    );
    probe(
      'percentages written as a word ("42 Prozent" / "42 percent") vs the "%" sign',
      'both forms inspected — they are the same claim',
      `"42 %" checked=${sign.totalChecked} | "42 Prozent" checked=${word.totalChecked} | "42 percent" checked=${english.totalChecked}`,
      word.totalChecked > 0 && english.totalChecked > 0 ? 'OK' : 'GAP',
    );
  }

  {
    const letter = grounding.validate(
      { coverLetter: '<p>Ich führte ein Team von 25 Pflegekräften auf 40 Betten.</p>' },
      healthcareProfile,
      healthcare.jobPosting.fullText,
    );
    const resume = grounding.validate(
      { resume: asResumeJson(['Führung eines Teams von 25 Pflegekräften auf 40 Betten.']) },
      healthcareProfile,
    );
    probe(
      'fabricated head-counts ("Team von 25", "40 Betten"; profile says 12 / 16)',
      'inspected — a wrong team size is as damaging as a wrong percentage',
      `cover letter checked=${letter.totalChecked} | résumé checked=${resume.totalChecked}`,
      letter.totalChecked > 0 || resume.totalChecked > 0 ? 'OK' : 'GAP',
    );
  }

  {
    const report = grounding.validate(
      {
        coverLetter:
          '<p>Ich habe den Umsatz verdoppelt, die Reklamationsquote halbiert und einen dreistelligen Neukundenzuwachs erreicht.</p>',
      },
      salesProfile,
      sales.jobPosting.fullText,
    );
    probe(
      'impact written out in words ("verdoppelt", "halbiert", "dreistellig")',
      'inspected — these are quantified claims without digits',
      `checked=${report.totalChecked}`,
      report.totalChecked > 0 ? 'OK' : 'GAP',
    );
  }

  {
    const report = grounding.validate(
      { coverLetter: '<p>Ich steigerte die Marge um 45 % und verantwortete 1,2 Mio. Euro Budget.</p>' },
      salesProfile,
      sales.jobPosting.fullText,
    );
    probe(
      'unit collapse: normalizeNumber() strips units, so "45 %" can be grounded by "4,5 Millionen Euro"',
      'the "45 %" claim is reported as unsupported (no 45 % anywhere in the profile)',
      `checked=${report.totalChecked} unsupported=${report.unsupported.length}`,
      report.unsupported.length > 0 ? 'OK' : 'GAP',
    );
  }

  {
    const claim = '<p>Ein Portfolio von 250 Bestandskunden habe ich ausgebaut.</p>';
    const withJob = grounding.validate({ coverLetter: claim }, salesProfile, sales.jobPosting.fullText);
    const resumeTwin = grounding.validate(
      { resume: asResumeJson(['Ausbau eines Portfolios von 250 Bestandskunden.']) },
      salesProfile,
    );
    probe(
      'job-ad laundering: the letter claims the AD\'s own figure ("250 Bestandskunden"; profile has 58 / 120)',
      'flagged in the cover letter, exactly as the identical résumé claim is',
      `cover letter unsupported=${withJob.unsupported.length} | résumé unsupported=${resumeTwin.unsupported.length}`,
      withJob.unsupported.length === resumeTwin.unsupported.length ? 'OK' : 'GAP',
    );
    const offline = grounding.validate({ coverLetter: claim }, salesProfile);
    probe(
      'scorer parity: same letter scored by the production corpus vs the headless-generate.ts scorer',
      'identical score (headless-generate.ts states "scorer version == generator version")',
      `production score=${withJob.score} | headless scorer score=${offline.score}`,
      withJob.score === offline.score ? 'OK' : 'GAP',
    );
  }
}

function probeStyle(): void {
  // The "Example Openings" shipped in prompts/v1/cover-letter.md — the few-shots
  // the writer model imitates.
  const md = fs.readFileSync(path.join(PROMPT_DIR, 'cover-letter.md'), 'utf8');
  const section = md.slice(md.indexOf('## Example Openings'));
  const openings: { label: string; text: string }[] = [];
  const openingPattern = /\*\*(.+?):\*\*\s*\n"([\s\S]*?)"/g;
  let openingMatch: RegExpExecArray | null;
  while ((openingMatch = openingPattern.exec(section)) !== null) {
    openings.push({ label: openingMatch[1], text: openingMatch[2].replace(/\s+/g, ' ').trim() });
  }

  const flaggedOpenings = openings.filter((opening) => {
    const lang = /German/i.test(opening.label) ? 'de' : 'en';
    const report = lintGeneratedStyle(opening.text, lang);
    return report.aiPhrases.length + report.hedging.length > 0;
  });
  probe(
    `style linter on the ${openings.length} example openings shipped in prompts/v1/cover-letter.md`,
    'flagged — the same prompt forbids these cliché families, so the few-shots must not contain them',
    `${flaggedOpenings.length}/${openings.length} flagged · labels: ${openings.map((o) => o.label).join(' | ')}`,
    openings.length > 0 && flaggedOpenings.length === openings.length ? 'OK' : 'GAP',
  );

  {
    const placeholderOpenings = openings.filter((o) => o.text.includes('[Company]'));
    probe(
      'the example openings use the "[Company]" placeholder the same prompt bans',
      'no placeholder — the prompt requires a real company name',
      `${placeholderOpenings.length}/${openings.length} openings contain "[Company]"`,
      placeholderOpenings.length === 0 ? 'OK' : 'GAP',
    );
  }

  {
    const boilerplate =
      'Sehr geehrte Damen und Herren, mit großem Interesse habe ich Ihre Stellenanzeige gelesen. ' +
      'Hiermit bewerbe ich mich um die ausgeschriebene Stelle. Ich bin teamfähig und belastbar und ' +
      'bringe ein hohes Maß an Eigeninitiative mit. Über eine Einladung zu einem persönlichen ' +
      'Gespräch freue ich mich sehr.';
    const report = lintGeneratedStyle(boilerplate, 'de');
    probe(
      'German application boilerplate ("mit großem Interesse", "hiermit bewerbe ich mich", "teamfähig und belastbar")',
      'flagged — this is the dominant German cliché family',
      `findings=${report.aiPhrases.length + report.hedging.length}`,
      report.aiPhrases.length + report.hedging.length > 0 ? 'OK' : 'GAP',
    );
  }

  {
    const clichés =
      'I was thrilled to see your opening. As a dynamic, results-driven team player I can hit the ' +
      'ground running in your fast-paced environment and leverage my skills to add value from day one.';
    const report = lintGeneratedStyle(clichés, 'en');
    probe(
      'English HR clichés ("thrilled", "results-driven", "team player", "hit the ground running")',
      'flagged — this is the dominant English cliché family',
      `findings=${report.aiPhrases.length + report.hedging.length}`,
      report.aiPhrases.length + report.hedging.length > 0 ? 'OK' : 'GAP',
    );
  }

  {
    const control =
      'Ich bin begeistert von der Möglichkeit, bei Ihnen zu arbeiten, und würde mich sehr freuen.';
    const report = lintGeneratedStyle(control, 'de');
    probe(
      'positive control — a listed German cliché plus hedging',
      'flagged',
      `findings=${report.aiPhrases.length + report.hedging.length} (${[...report.aiPhrases, ...report.hedging].join(', ')})`,
      report.aiPhrases.length + report.hedging.length > 0 ? 'OK' : 'GAP',
    );
  }

  {
    const french =
      "C'est avec un grand intérêt que j'ai pris connaissance de votre annonce. Je suis dynamique, " +
      'motivé et rigoureux, et je serais ravi de mettre mes compétences au service de votre entreprise.';
    const report = lintGeneratedStyle(french, 'fr');
    probe(
      'export locale: a French letter full of the equivalent clichés (translation.service.ts lints translations)',
      'flagged — fr/es/pt/it are shipped export languages',
      `findings=${report.aiPhrases.length + report.hedging.length}`,
      report.aiPhrases.length + report.hedging.length > 0 ? 'OK' : 'GAP',
    );
  }
}

function probeKeywords(fixtures: EvalFixture[]): void {
  const healthcare = fixtureById(fixtures, 'healthcare-de');
  const healthcareProfile = hydrateProfile(healthcare);
  const it = fixtureById(fixtures, 'it-en');
  const itProfile = hydrateProfile(it);

  {
    // "Einarbeitungskonzept" and "Beatmung" occur ONLY in the achievements.
    const keywords: AtsHardSkill[] = [
      { keyword: 'Intensivpflege', priority: 1 },
      { keyword: 'Einarbeitungskonzept', priority: 1 },
      { keyword: 'Beatmung', priority: 1 },
    ];
    const matched = matchAtsKeywordsToProfile({ hard_skills: keywords }, healthcareProfile);
    const summary = (matched.hard_skills ?? [])
      .map((k) => `${k.keyword}=${k.source}`)
      .join(', ');
    const allSupported = (matched.hard_skills ?? []).every((k) => k.source === 'both');
    probe(
      'profile-support detection ignores experience.achievements and profile.summary',
      'all three tagged source=both — the profile demonstrably contains them',
      summary,
      allSupported ? 'OK' : 'GAP',
    );
  }

  {
    // Profile skill "Go" makes every keyword containing "go" look supported.
    const keywords: AtsHardSkill[] = [
      { keyword: 'Django', priority: 1 },
      { keyword: 'Google Cloud', priority: 1 },
    ];
    const matched = matchAtsKeywordsToProfile({ hard_skills: keywords }, itProfile);
    const summary = (matched.hard_skills ?? []).map((k) => `${k.keyword}=${k.source}`).join(', ');
    const anyFalsePositive = (matched.hard_skills ?? []).some((k) => k.source === 'both');
    probe(
      'substring over-match: `keyword.includes(skillName)` lets the skill "Go" support "Django"/"Google Cloud"',
      'both tagged source=job — the weave pass must never inject an unsupported keyword',
      summary,
      anyFalsePositive ? 'GAP' : 'OK',
    );
  }

  {
    const letter =
      '<p>Die Weiterentwicklung des Qualitätsmanagementsystems und des Wundmanagements gehört ' +
      'ebenso zu meinem Alltag wie die Erstellung der Dienstpläne.</p>';
    const keywords: AtsHardSkill[] = [
      { keyword: 'Qualitätsmanagement', priority: 1, source: 'both' },
      { keyword: 'Wundmanagement', priority: 1, source: 'both' },
      { keyword: 'Dienstplan', priority: 1, source: 'both' },
    ];
    const coverage = computePriority1Coverage({ hard_skills: keywords }, letter);
    const weave = selectKeywordsToWeave({ hard_skills: keywords }, letter);
    probe(
      'German morphology: compounds and inflections ("Qualitätsmanagementsystems", "Dienstpläne")',
      'coverage 100 %, nothing selected for the weave pass',
      `coverage=${coverage.rate}% missing=[${coverage.missing.join(', ')}] weave=[${weave.join(', ')}]`,
      coverage.rate === 100 && weave.length === 0 ? 'OK' : 'GAP',
    );
  }

  {
    const matched = matchAtsKeywordsToProfile(
      { hard_skills: [{ keyword: 'Intensivpflege', priority: 1 }] },
      healthcareProfile,
    );
    probe(
      'soft skills are dropped by matchAtsKeywordsToProfile (returns soft_skills: [])',
      'soft-skill requirements measured, or at least carried through',
      `soft_skills=${JSON.stringify(matched.soft_skills ?? [])}`,
      (matched.soft_skills ?? []).length > 0 ? 'OK' : 'GAP',
    );
  }

  probe(
    'ATS coverage is computed for the cover letter only — no résumé equivalent exists',
    'a coverage metric for the résumé, the document an ATS parses first',
    'computePriority1Coverage() is called with the cover letter in headless/generate.ts; no résumé call site exists',
    'GAP',
  );
}

function probeLengthAndSalutation(): void {
  const body = Array.from({ length: 300 }, (_, i) => `Wort${i}`).join(' ');
  const german = `<p>Sehr geehrte Frau Dr. Hoffmann,</p><p>${body}</p><p>Mit freundlichen Grüßen</p><p>Sabine Krüger</p>`;
  const lint = lintCoverLetterLength(german, 350, 'de');
  probe(
    'positive control — body-word counting excludes salutation and closing (DE, budget 350)',
    'words ≈ 300, severity ok, salutation extracted',
    `words=${lint.words} severity=${lint.severity} salutation=${JSON.stringify(extractSalutationLine(german))}`,
    lint.severity === 'ok' && extractSalutationLine(german) !== null ? 'OK' : 'GAP',
  );

  const frenchBody = Array.from({ length: 600 }, (_, i) => `mot${i}`).join(' ');
  const french = `<p>Madame, Monsieur,</p><p>${frenchBody}</p><p>Cordialement</p><p>Sabine Krüger</p>`;
  probe(
    'export locale: French salutation/closing are invisible to the length governor regexes',
    'salutation recognised, so the shorten guard can preserve it',
    `salutation=${JSON.stringify(extractSalutationLine(french))}`,
    extractSalutationLine(french) !== null ? 'OK' : 'GAP',
  );

  const gendered = buildSalutation({ contact_name: 'Petra Hoffmann', contact_salutation: 'Frau Dr.' }, 'de');
  const ungenderedDe = buildSalutation({ contact_name: 'Alex Weber', contact_salutation: '' }, 'de');
  const ungenderedEn = buildSalutation({ contact_name: 'Alex Weber', contact_salutation: '' }, 'en');
  probe(
    'salutation: a known contact name without a Frau/Herr marker (diverse or ambiguous names)',
    'the known name is used, as it is in English',
    `de gendered="${gendered}" · de ungendered="${ungenderedDe}" · en ungendered="${ungenderedEn}"`,
    ungenderedDe.includes('Weber') ? 'OK' : 'GAP',
  );
}

// ───────────────────── Section C — exported cover-letter shape ────────────────

/**
 * Renders a cover letter with exactly the data
 * `apps/api/src/jobs/processors/application.processor.ts` builds, then reads the
 * text back out of the PDF. This is what the candidate actually sends.
 */
async function probeCoverLetterPdf(): Promise<void> {
  // Field-for-field the object built in application.processor.ts (the only
  // caller of generateCoverLetterPDF).
  const data = {
    candidateName: 'Sabine Krüger',
    targetJobTitle: 'Stationsleitung Intensivpflege (m/w/d)',
    email: 'sabine.krueger@example.com',
    phone: '+49 151 23456789',
    street: 'Lindenstraße 14',
    postalCode: '20095',
    city: 'Hamburg',
    country: 'Deutschland',
    fullAddress: 'Lindenstraße 14, 20095 Hamburg',
    companyName: 'Klinikum Nordlicht gGmbH',
    content:
      '<p>Sehr geehrte Frau Dr. Hoffmann,</p><p>die Leitung Ihrer Intensivstation reizt mich, ' +
      'weil Sie Weiterbildung strukturell verankern.</p><p>Über ein Gespräch freue ich mich.</p>',
    language: 'de',
  };

  const reactPdf = await loadReactPdf();
  const CoverLetter = ClassicAtsFactory.coverLetter;
  if (!CoverLetter) throw new Error('classic-ats has no cover-letter factory');
  const element = createElement(CoverLetter(reactPdf), {
    data,
    meta: { language: 'de', accentColor: '#1f3a5f' },
  });
  const buffer = await reactPdf.renderToBuffer(element);
  const text = (await new PDFParse({ data: new Uint8Array(buffer) }).getText()).text;

  const has = (needle: string): boolean => text.includes(needle);
  console.log(`Extracted cover-letter text:\n${text.trim()}\n`);

  probe(
    'exported cover letter contains a closing formula ("Mit freundlichen Grüßen")',
    'present — stripClosingPhrase() removes the LLM\'s closing because "the template adds it"',
    `closing present=${has('Mit freundlichen Grüßen')} (template renders data.closingPhrase, which the processor never sets)`,
    has('Mit freundlichen Grüßen') ? 'OK' : 'GAP',
  );
  const datePattern =
    /\d{1,2}\.\s?(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s?\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},\s\d{4}/;
  probe(
    'exported cover letter contains a date line',
    'present — every template renders data.date',
    `date present=${datePattern.test(text)} (the processor never sets data.date)`,
    datePattern.test(text) ? 'OK' : 'GAP',
  );
  probe(
    'exported cover letter contains the recipient / company',
    'present — companyName is passed by the processor',
    `company present=${has('Klinikum Nordlicht')} (no template renders data.companyName / recipientName / companyAddress)`,
    has('Klinikum Nordlicht') ? 'OK' : 'GAP',
  );
  probe(
    'exported cover letter contains a Betreffzeile (subject line)',
    'present — DIN 5008 expects one, and it is the first thing a recruiter reads',
    'CoverLetterTemplateData has no subject field (pdf-v2/template-data.ts)',
    'GAP',
  );
}

// ────────────────────────────────── main ──────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fixtures = loadFixtures();

  console.log('Deterministic output-quality probe — no LLM, no database, no network.');
  console.log(`Fixtures: ${fixtures.length} (${new Set(fixtures.map((f) => f.profession)).size} professions)\n`);

  section('A. Instrument coverage over the committed fixture corpus');
  measureGroundingRecall(fixtures);
  measureStyleCoverage();

  section('B1. Grounding validator');
  probeGrounding(fixtures);

  section('B2. Style linter');
  probeStyle();

  section('B3. ATS keyword coverage');
  probeKeywords(fixtures);

  section('B4. Length governor and salutation');
  probeLengthAndSalutation();

  if (!args.includes('--no-pdf')) {
    section('C. Exported cover-letter structure (real PDF render)');
    await probeCoverLetterPdf();
  }

  const gaps = results.filter((r) => r.verdict === 'GAP');
  section('Summary');
  for (const result of results) {
    console.log(`  ${result.verdict === 'GAP' ? 'GAP' : ' OK'}  ${result.id}  ${result.title}`);
  }
  console.log(`\n${results.length} probes · ${gaps.length} gaps · ${results.length - gaps.length} ok`);

  if (args.includes('--fail-on-gaps') && gaps.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
