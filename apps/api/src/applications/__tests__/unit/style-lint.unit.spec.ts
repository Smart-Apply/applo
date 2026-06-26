import {
  detectGermanVerbFirstBullets,
  evaluateStyleRewrite,
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
