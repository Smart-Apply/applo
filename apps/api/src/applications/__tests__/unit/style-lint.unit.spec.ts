import { lintGeneratedStyle } from '../../style-lint.util';

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
