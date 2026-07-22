import {
  countCoverLetterBodyWords,
  detectGermanVerbFirstBullets,
  evaluateShortenRewrite,
  evaluateStyleRewrite,
  extractSalutationLine,
  lintCoverLetterLength,
  lintGeneratedStyle,
} from '../../style-lint.util';

describe('lintGeneratedStyle', () => {
  it('returns no violations for empty or whitespace input', () => {
    expect(lintGeneratedStyle('', 'de')).toEqual({ aiPhrases: [], hedging: [], total: 0 });
    expect(lintGeneratedStyle('   \n  ', 'de').total).toBe(0);
    expect(lintGeneratedStyle(null, 'de').total).toBe(0);
    expect(lintGeneratedStyle(undefined, 'en').total).toBe(0);
  });

  it('flags a German AI cliché and Konjunktiv hedging', () => {
    const text =
      'Ich bin begeistert von der Möglichkeit. Ich würde mich freuen, von Ihnen zu hören.';
    const result = lintGeneratedStyle(text, 'de');
    expect(result.aiPhrases).toContain('ich bin begeistert');
    expect(result.hedging).toContain('würde mich freuen');
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it('flags English AI clichés', () => {
    const result = lintGeneratedStyle(
      'I am passionate about this role and have a proven track record.',
      'en',
    );
    expect(result.aiPhrases).toEqual(
      expect.arrayContaining(['passionate about', 'proven track record']),
    );
  });

  it('does not flag German hedging when the language is English', () => {
    // "könnte" is a German hedging trigger; in an English doc it must be ignored.
    const result = lintGeneratedStyle('The system könnte scale, but I led the migration.', 'en');
    expect(result.hedging).toEqual([]);
  });

  it('strips HTML before matching so tags do not hide phrases', () => {
    const html = '<p>Ich bin <strong>begeistert</strong> von der Möglichkeit.</p>';
    const result = lintGeneratedStyle(html, 'de');
    expect(result.aiPhrases).toContain('ich bin begeistert');
  });

  it('handles umlaut word boundaries correctly (no false negative on "äußerst begeistert")', () => {
    const result = lintGeneratedStyle('Ich bin äußerst begeistert von Ihrem Team.', 'de');
    expect(result.aiPhrases).toContain('äußerst begeistert');
  });

  it('reports a clean, confident German letter as violation-free', () => {
    const text =
      'Als Krankenpfleger betreute ich bis zu 18 Patient:innen pro Schicht. Ich freue mich auf das Gespräch.';
    expect(lintGeneratedStyle(text, 'de').total).toBe(0);
  });

  it('deduplicates repeated phrases', () => {
    const text = 'passionate about teaching. passionate about mentoring.';
    const result = lintGeneratedStyle(text, 'en');
    expect(result.aiPhrases.filter((p) => p === 'passionate about')).toHaveLength(1);
  });
});

describe('evaluateStyleRewrite', () => {
  const dirty =
    'Ich bin begeistert von der Möglichkeit. Als Krankenpfleger betreute ich bis zu 18 Patient:innen pro Schicht. Ich würde mich freuen, von Ihnen zu hören.';
  const clean =
    'Als Krankenpfleger betreute ich bis zu 18 Patient:innen pro Schicht und koordinierte die Übergaben. Ich freue mich auf das Gespräch.';

  it('accepts a rewrite that strictly reduces violations and keeps the length', () => {
    const verdict = evaluateStyleRewrite(dirty, clean, 'de');
    expect(verdict.accept).toBe(true);
    expect(verdict.reason).toBe('improved');
    expect(verdict.after).toBeLessThan(verdict.before);
  });

  it('rejects a rewrite that does not reduce violations', () => {
    // Same two violations survive — must not be shipped.
    const verdict = evaluateStyleRewrite(dirty, dirty, 'de');
    expect(verdict.accept).toBe(false);
    expect(verdict.reason).toBe('not-improved');
    expect(verdict.after).toBe(verdict.before);
  });

  it('rejects an empty or gutted rewrite (length guard) without re-linting it', () => {
    const empty = evaluateStyleRewrite(dirty, '', 'de');
    expect(empty.accept).toBe(false);
    expect(empty.reason).toBe('too-short');

    const gutted = evaluateStyleRewrite(dirty, 'Ich freue mich.', 'de');
    expect(gutted.accept).toBe(false);
    expect(gutted.reason).toBe('too-short');
    // after falls back to before when the candidate is rejected on length.
    expect(gutted.after).toBe(gutted.before);
  });

  it('rejects a rewrite that swaps one cliché for another (no net gain)', () => {
    // One violation in, one different violation out → count unchanged → reject.
    const oneCliche =
      'Ich bin begeistert von der Stelle. Ich leite seit drei Jahren ein Team von acht Pflegekräften.';
    const swapped =
      'Ich bin leidenschaftlich bei der Arbeit. Ich leite seit drei Jahren ein Team von acht Pflegekräften.';
    const verdict = evaluateStyleRewrite(oneCliche, swapped, 'de');
    expect(verdict.before).toBe(1);
    expect(verdict.after).toBe(1);
    expect(verdict.accept).toBe(false);
    expect(verdict.reason).toBe('not-improved');
  });
});

describe('detectGermanVerbFirstBullets', () => {
  it('flags a German bullet that opens with a finite past-tense verb', () => {
    const hits = detectGermanVerbFirstBullets(
      ['Entwickelte eine wiederverwendbare Terraform- und Azure-Vorlage für Multi-Stage Deployments'],
      'de',
    );
    expect(hits).toHaveLength(1);
  });

  it('flags -ierte verbs via the suffix rule', () => {
    const hits = detectGermanVerbFirstBullets(
      ['Implementierte eine CI/CD-Pipeline', 'Optimierte die Rüstprozesse', 'Migrierte zwölf Dienste'],
      'de',
    );
    expect(hits).toHaveLength(3);
  });

  it('does NOT flag idiomatic Nominalstil bullets', () => {
    const hits = detectGermanVerbFirstBullets(
      [
        'Entwicklung einer wiederverwendbaren Terraform-Vorlage für Multi-Stage-Deployments',
        'Reduktion des Ausschusses um 12 % durch Optimierung der CNC-Rüstprozesse',
        'Betreuung von bis zu 18 Patient:innen pro Schicht',
      ],
      'de',
    );
    expect(hits).toEqual([]);
  });

  it('never flags for English (verb-first is correct there)', () => {
    const hits = detectGermanVerbFirstBullets(
      ['Developed a reusable Terraform template', 'Reduced deployment time by 60%'],
      'en',
    );
    expect(hits).toEqual([]);
  });

  it('strips leading list markers before checking the first word', () => {
    const hits = detectGermanVerbFirstBullets(['- Leitete ein Team von acht Pflegekräften'], 'de');
    expect(hits).toHaveLength(1);
  });

  it('does not flag a noun-led bullet that merely contains a verb later', () => {
    const hits = detectGermanVerbFirstBullets(
      ['Aufbau eines Onboarding-Prozesses, der neue Mitarbeitende schneller einsatzfähig machte'],
      'de',
    );
    expect(hits).toEqual([]);
  });
});

/** Build a letter with an exact body word count around the standard contract. */
function makeLetter(
  bodyWords: number,
  {
    salutation = 'Sehr geehrte Damen und Herren,',
    closing = 'Mit freundlichen Grüßen,\nMax Mustermann',
    lead = '',
  }: { salutation?: string; closing?: string | null; lead?: string } = {},
): string {
  const leadTokens = lead ? lead.split(/\s+/).length : 0;
  const filler = Array(Math.max(0, bodyWords - leadTokens))
    .fill('Wort')
    .join(' ');
  const body = [lead, filler].filter(Boolean).join(' ');
  return [salutation, '', body, '', closing ?? ''].join('\n').trim();
}

describe('countCoverLetterBodyWords', () => {
  it('returns 0 for empty input', () => {
    expect(countCoverLetterBodyWords('')).toBe(0);
    expect(countCoverLetterBodyWords(null)).toBe(0);
    expect(countCoverLetterBodyWords(undefined)).toBe(0);
    expect(countCoverLetterBodyWords('   \n ')).toBe(0);
  });

  it('excludes the German salutation line and closing block', () => {
    const letter = makeLetter(100);
    expect(countCoverLetterBodyWords(letter)).toBe(100);
  });

  it('excludes the English salutation line and closing block', () => {
    const letter = makeLetter(80, {
      salutation: 'Dear Hiring Manager,',
      closing: 'Sincerely,\nJane Doe',
    });
    expect(countCoverLetterBodyWords(letter)).toBe(80);
  });

  it('counts a letter without closing (editor-pass output ends on the last paragraph)', () => {
    const letter = makeLetter(60, { closing: null });
    expect(countCoverLetterBodyWords(letter)).toBe(60);
  });

  it('counts stored HTML the same as Markdown', () => {
    const html =
      '<p>Sehr geehrte Frau Schmidt,</p>' +
      '<p>Als Pflegefachkraft betreue ich achtzehn Personen pro Schicht.</p>' +
      '<p>Mit freundlichen Grüßen,<br>Max Mustermann</p>';
    // 8 body words: the salutation and closing paragraphs are stripped.
    expect(countCoverLetterBodyWords(html)).toBe(8);
  });

  it('handles umlaut words as single tokens and skips bare punctuation', () => {
    const letter = makeLetter(0, {
      lead: 'Führungskräfte — übernehmen Verantwortung für Qualitätssicherung',
      closing: null,
    });
    // "—" is not a word; the 5 German words are.
    expect(countCoverLetterBodyWords(letter)).toBe(5);
  });
});

describe('extractSalutationLine', () => {
  it('returns the salutation when the first line matches the contract', () => {
    expect(extractSalutationLine('Sehr geehrte Damen und Herren,\n\nText.')).toBe(
      'Sehr geehrte Damen und Herren,',
    );
    expect(extractSalutationLine('<p>Dear Ms. Smith,</p><p>Body.</p>')).toBe('Dear Ms. Smith,');
  });

  it('returns null when the letter does not open with a salutation', () => {
    expect(extractSalutationLine('Als Vertriebsleiter überzeuge ich täglich.')).toBeNull();
    expect(extractSalutationLine(null)).toBeNull();
  });
});

describe('lintCoverLetterLength', () => {
  it('reports ok when within budget', () => {
    const result = lintCoverLetterLength(makeLetter(300), 350, 'de');
    expect(result).toMatchObject({ words: 300, budget: 350, overrun: false, severity: 'ok' });
  });

  it('tolerates a borderline overrun (within tolerance)', () => {
    // DE tolerance: 350 × 0.2 = 70 → overrun only above 420 words.
    const result = lintCoverLetterLength(makeLetter(410), 350, 'de');
    expect(result.overrun).toBe(false);
    expect(result.severity).toBe('ok');
  });

  it('applies the tighter English tolerance', () => {
    // EN tolerance: 350 × 0.15 = 53 → 410 words IS an overrun in English.
    const result = lintCoverLetterLength(
      makeLetter(410, { salutation: 'Dear Hiring Manager,', closing: 'Sincerely,\nJane Doe' }),
      350,
      'en',
    );
    expect(result.overrun).toBe(true);
    expect(result.severity).toBe('warn');
  });

  it('flags a clear overrun as warn', () => {
    const result = lintCoverLetterLength(makeLetter(460), 350, 'de');
    expect(result).toMatchObject({ overrun: true, severity: 'warn' });
  });

  it('classifies the "2-page" class (≥ 1.5× budget) as critical', () => {
    const result = lintCoverLetterLength(makeLetter(525), 350, 'de');
    expect(result).toMatchObject({ overrun: true, severity: 'critical' });
  });

  it('respects the kurz budget', () => {
    const result = lintCoverLetterLength(makeLetter(340), 250, 'de');
    // 250 × 0.2 = 50 → limit 300 → 340 overruns.
    expect(result.overrun).toBe(true);
  });
});

describe('evaluateShortenRewrite', () => {
  const budget = 350;
  const overrunDraft = makeLetter(500, { lead: 'Wundversorgung' });

  it('accepts a genuinely shorter, clean rewrite', () => {
    const shortened = makeLetter(340, { lead: 'Wundversorgung' });
    const decision = evaluateShortenRewrite(overrunDraft, shortened, budget, 'de', [
      'Wundversorgung',
    ]);
    expect(decision.accept).toBe(true);
    expect(decision.reason).toBe('shortened');
    expect(decision.wordsBefore).toBe(500);
    expect(decision.wordsAfter).toBe(340);
  });

  it('rejects empty output', () => {
    expect(evaluateShortenRewrite(overrunDraft, '', budget, 'de').reason).toBe('empty');
    expect(evaluateShortenRewrite(overrunDraft, null, budget, 'de').reason).toBe('empty');
  });

  it('rejects a gutted letter (below half the draft length)', () => {
    const gutted = makeLetter(60);
    expect(evaluateShortenRewrite(overrunDraft, gutted, budget, 'de').reason).toBe('gutted');
  });

  it('rejects when the salutation line changed', () => {
    const shortened = makeLetter(340, {
      salutation: 'Sehr geehrte Frau Schmidt,',
      lead: 'Wundversorgung',
    });
    expect(evaluateShortenRewrite(overrunDraft, shortened, budget, 'de').reason).toBe(
      'salutation-changed',
    );
  });

  it('rejects when still over budget', () => {
    const shortened = makeLetter(450, { lead: 'Wundversorgung' });
    expect(evaluateShortenRewrite(overrunDraft, shortened, budget, 'de').reason).toBe(
      'still-over-budget',
    );
  });

  it('rejects when the style-violation count increased', () => {
    const shortened = makeLetter(340, {
      lead: 'Ich bin begeistert von der Möglichkeit und biete Wundversorgung',
    });
    expect(evaluateShortenRewrite(overrunDraft, shortened, budget, 'de').reason).toBe(
      'style-regressed',
    );
  });

  it('rejects when a woven keyword was dropped', () => {
    const shortened = makeLetter(340);
    const decision = evaluateShortenRewrite(overrunDraft, shortened, budget, 'de', [
      'Wundversorgung',
    ]);
    expect(decision.reason).toBe('keyword-dropped');
  });

  it('skips the salutation check when the draft has no salutation-style opener', () => {
    const draft = Array(500).fill('Wort').join(' ');
    const shortened = Array(340).fill('Wort').join(' ');
    const decision = evaluateShortenRewrite(draft, shortened, budget, 'de');
    expect(decision.accept).toBe(true);
  });
});
