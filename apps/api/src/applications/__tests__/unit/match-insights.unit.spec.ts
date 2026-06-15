import { buildMatchInsights, cleanRoleLabel } from '../../match-insights.util';
import type { MatchKeywordLite } from '../../match-insights.util';

const kw = (keyword: string, category: string): MatchKeywordLite => ({ keyword, category });

describe('cleanRoleLabel (Unit)', () => {
  it('strips parenthetical gender markers', () => {
    expect(cleanRoleLabel('Pflegedienstleitung (m/w/d)')).toBe('Pflegedienstleitung');
    expect(cleanRoleLabel('Fertigungsleiter (w/m/d/x)')).toBe('Fertigungsleiter');
  });

  it('strips bare m/w/d without parentheses', () => {
    expect(cleanRoleLabel('Vertriebsleiter m/w/d')).toBe('Vertriebsleiter');
  });

  it('returns undefined for empty / missing input', () => {
    expect(cleanRoleLabel(undefined)).toBeUndefined();
    expect(cleanRoleLabel('   ')).toBeUndefined();
    expect(cleanRoleLabel('(m/w/d)')).toBeUndefined();
  });

  it('leaves a clean title untouched', () => {
    expect(cleanRoleLabel('Krankenpfleger')).toBe('Krankenpfleger');
  });
});

describe('buildMatchInsights (Unit)', () => {
  it('names missing high-value keywords and references the target role', () => {
    const { suggestions, weaknesses } = buildMatchInsights(
      [],
      [kw('Qualitätsmanagement', 'core')],
      { overallScore: 40, experienceScore: 0 },
      'Pflegedienstleitung (m/w/d)',
    );

    // Specific keyword + role-anchored + no-fabrication framing.
    expect(suggestions[0]).toContain('Qualitätsmanagement');
    expect(suggestions[0]).toContain('Pflegedienstleitung');
    expect(suggestions[0]).toContain('nachweisen');
    expect(weaknesses.some((w) => w.includes('Schlüsselbegriff'))).toBe(true);
  });

  it('ignores soft / seniority / responsibility categories when picking gaps', () => {
    const { suggestions, weaknesses } = buildMatchInsights(
      [],
      [kw('Teamgeist', 'soft'), kw('Senior', 'seniority'), kw('Aufgaben', 'responsibility')],
      { overallScore: 90, experienceScore: 0 },
      'Teamleiter',
    );

    // No hard gaps → no "missing keyword" suggestion/weakness produced.
    expect(weaknesses).toHaveLength(0);
    expect(suggestions.join(' ')).not.toContain('Teamgeist');
  });

  it('gives per-keyword hints for the top 2 and groups the rest', () => {
    const missing = [
      kw('CNC', 'technical'),
      kw('CAD', 'technical'),
      kw('SPC', 'methodology'),
      kw('ISO 9001', 'requirement'),
    ];
    const { suggestions } = buildMatchInsights(
      [],
      missing,
      { overallScore: 30, experienceScore: 0 },
      'Fertigungsleiter',
    );

    // Two individual keyword suggestions.
    expect(suggestions.filter((s) => s.startsWith('Belege'))).toHaveLength(2);
    // Grouped remainder lists the others.
    const grouped = suggestions.find((s) => s.includes('fehlen noch'));
    expect(grouped).toBeDefined();
    expect(grouped).toContain('SPC');
    expect(grouped).toContain('ISO 9001');
  });

  it('adds a concrete low-coverage nudge that includes the score', () => {
    const { suggestions } = buildMatchInsights(
      [],
      [kw('Python', 'technical')],
      { overallScore: 25, experienceScore: 0 },
      'Data Analyst',
    );

    expect(suggestions.some((s) => s.includes('25%'))).toBe(true);
  });

  it('reassures (no invented work) when everything is covered', () => {
    const { suggestions, strengths, weaknesses } = buildMatchInsights(
      [kw('Salesforce', 'tool'), kw('Forecasting', 'core')],
      [],
      { overallScore: 100, experienceScore: 80 },
      'Account Executive',
    );

    expect(weaknesses).toHaveLength(0);
    expect(strengths.some((s) => s.includes('Salesforce'))).toBe(true);
    expect(suggestions.some((s) => s.includes('Alle wichtigen Begriffe'))).toBe(true);
  });

  it('omits the role suffix when no target role is given', () => {
    const { suggestions } = buildMatchInsights(
      [],
      [kw('Buchhaltung', 'core')],
      { overallScore: 40, experienceScore: 0 },
      undefined,
    );

    expect(suggestions[0]).not.toContain(' als „');
  });
});
