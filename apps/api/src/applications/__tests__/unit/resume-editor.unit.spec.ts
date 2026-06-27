import {
  collectResumeBullets,
  countResumeStyleViolations,
  evaluateResumeStyleRewrite,
  extractResumeProse,
  isValidResumeEdit,
} from '../../resume-editor.util';
import type { RewrittenProfileDto } from '../../dto/tailored-profile.dto';

const base = (): RewrittenProfileDto => ({
  rewritten_summary: 'Examinierte Pflegefachkraft mit 9 Jahren Erfahrung auf der Intensivstation.',
  rewritten_experiences: [
    {
      profileExperienceId: 'exp-aaa',
      rewritten_description: 'Schichtleitung auf der Intensivstation.',
      rewritten_achievements: ['Senkte die Fluktuation um 18 Prozent.'],
    },
    {
      profileExperienceId: 'exp-bbb',
      rewritten_description: '',
      rewritten_achievements: ['Betreute eine Patientengruppe von 6 Betten.'],
    },
  ],
  rewritten_projects: [
    {
      profileProjectId: 'proj-xyz',
      rewritten_description: 'Einführung eines digitalen Dokumentationssystems.',
      rewritten_highlights: ['Schulte 20 Kolleginnen.'],
    },
  ],
});

describe('isValidResumeEdit (Unit, #1)', () => {
  it('accepts a clean edit that preserves all ids', () => {
    const original = base();
    const edited = base();
    edited.rewritten_summary = 'Geschärftes Kurzprofil mit messbarem Ergebnis.';
    edited.rewritten_experiences[0].rewritten_achievements = [
      'Reduzierte die Mitarbeiterfluktuation in zwei Jahren um 18 Prozent.',
    ];
    expect(isValidResumeEdit(original, edited)).toBe(true);
  });

  it('rejects a dropped experience id', () => {
    const original = base();
    const edited = base();
    edited.rewritten_experiences = [edited.rewritten_experiences[0]]; // drop exp-bbb
    expect(isValidResumeEdit(original, edited)).toBe(false);
  });

  it('rejects a changed/renamed experience id', () => {
    const original = base();
    const edited = base();
    edited.rewritten_experiences[1].profileExperienceId = 'exp-RENAMED';
    expect(isValidResumeEdit(original, edited)).toBe(false);
  });

  it('rejects an added experience id (hallucinated entry)', () => {
    const original = base();
    const edited = base();
    edited.rewritten_experiences.push({
      profileExperienceId: 'exp-new',
      rewritten_description: 'Erfundene Stelle.',
      rewritten_achievements: ['Erfunden.'],
    });
    expect(isValidResumeEdit(original, edited)).toBe(false);
  });

  it('rejects a dropped project id', () => {
    const original = base();
    const edited = base();
    edited.rewritten_projects = [];
    expect(isValidResumeEdit(original, edited)).toBe(false);
  });

  it('is order-insensitive for ids', () => {
    const original = base();
    const edited = base();
    edited.rewritten_experiences.reverse();
    expect(isValidResumeEdit(original, edited)).toBe(true);
  });

  it('rejects an empty / missing summary', () => {
    const original = base();
    const edited = base();
    edited.rewritten_summary = '   ';
    expect(isValidResumeEdit(original, edited)).toBe(false);
  });

  it('rejects gutting an entry that previously had content to nothing', () => {
    const original = base();
    const edited = base();
    edited.rewritten_experiences[0].rewritten_description = '';
    edited.rewritten_experiences[0].rewritten_achievements = [];
    expect(isValidResumeEdit(original, edited)).toBe(false);
  });

  it('allows an entry that was already empty to stay empty', () => {
    const original = base();
    original.rewritten_experiences[1].rewritten_description = '';
    original.rewritten_experiences[1].rewritten_achievements = [];
    const edited = base();
    edited.rewritten_experiences[1].rewritten_description = '';
    edited.rewritten_experiences[1].rewritten_achievements = [];
    expect(isValidResumeEdit(original, edited)).toBe(true);
  });

  it('rejects non-object / malformed input', () => {
    const original = base();
    expect(isValidResumeEdit(original, null)).toBe(false);
    expect(isValidResumeEdit(original, 'nope')).toBe(false);
    expect(isValidResumeEdit(original, { rewritten_summary: 'x' })).toBe(false);
  });
});

describe('extractResumeProse', () => {
  it('joins summary, descriptions, achievements and highlights; ignores ids', () => {
    const prose = extractResumeProse(base());
    expect(prose).toContain('Examinierte Pflegefachkraft');
    expect(prose).toContain('Schichtleitung auf der Intensivstation');
    expect(prose).toContain('Senkte die Fluktuation um 18 Prozent');
    expect(prose).toContain('Schulte 20 Kolleginnen');
    expect(prose).not.toContain('exp-aaa');
    expect(prose).not.toContain('proj-xyz');
  });

  it('returns an empty string for null / undefined', () => {
    expect(extractResumeProse(null)).toBe('');
    expect(extractResumeProse(undefined)).toBe('');
  });
});

describe('evaluateResumeStyleRewrite', () => {
  // base() is clean; inject one German cliché into the summary.
  const dirty = (): RewrittenProfileDto => {
    const p = base();
    p.rewritten_summary = 'Examinierte Pflegefachkraft, leidenschaftlich in der Intensivpflege.';
    return p;
  };

  it('accepts a rewrite that removes a cliché and preserves structure', () => {
    const verdict = evaluateResumeStyleRewrite(dirty(), base(), 'de');
    expect(verdict.accept).toBe(true);
    expect(verdict.reason).toBe('improved');
    expect(verdict.before).toBeGreaterThan(verdict.after);
  });

  it('rejects a rewrite that does not reduce violations', () => {
    const verdict = evaluateResumeStyleRewrite(dirty(), dirty(), 'de');
    expect(verdict.accept).toBe(false);
    expect(verdict.reason).toBe('not-improved');
  });

  it('rejects a structurally-invalid rewrite even when it is cleaner', () => {
    const edited = base(); // clean prose…
    edited.rewritten_experiences = [edited.rewritten_experiences[0]]; // …but drops an id
    const verdict = evaluateResumeStyleRewrite(dirty(), edited, 'de');
    expect(verdict.accept).toBe(false);
    expect(verdict.reason).toBe('invalid-structure');
  });

  it('accepts a verb-first → Nominalstil rewrite (verb-first counts as a violation)', () => {
    const original = base(); // bullets open with Senkte / Betreute / Schulte
    const edited = base();
    edited.rewritten_experiences[0].rewritten_achievements = ['Reduktion der Fluktuation um 18 Prozent.'];
    edited.rewritten_experiences[1].rewritten_achievements = ['Betreuung von 6 Betten pro Schicht.'];
    edited.rewritten_projects[0].rewritten_highlights = ['Schulung von 20 Kolleginnen.'];
    const verdict = evaluateResumeStyleRewrite(original, edited, 'de');
    expect(verdict.before).toBe(3);
    expect(verdict.after).toBe(0);
    expect(verdict.accept).toBe(true);
  });
});

describe('collectResumeBullets', () => {
  it('collects achievements + highlights, excluding the summary and descriptions', () => {
    const bullets = collectResumeBullets(base());
    expect(bullets).toContain('Senkte die Fluktuation um 18 Prozent.');
    expect(bullets).toContain('Schulte 20 Kolleginnen.');
    expect(bullets.some((b) => b.startsWith('Examinierte Pflegefachkraft'))).toBe(false);
    expect(bullets).not.toContain('Schichtleitung auf der Intensivstation.');
  });

  it('returns an empty array for null', () => {
    expect(collectResumeBullets(null)).toEqual([]);
  });
});

describe('countResumeStyleViolations', () => {
  it('counts German verb-first bullets as violations', () => {
    const v = countResumeStyleViolations(base(), 'de');
    expect(v.verbFirstBullets.length).toBe(3); // Senkte / Betreute / Schulte
    expect(v.total).toBe(3);
  });

  it('counts cliché phrases and verb-first bullets together', () => {
    const p = base();
    p.rewritten_summary = 'Pflegefachkraft, leidenschaftlich in der Intensivpflege.';
    const v = countResumeStyleViolations(p, 'de');
    expect(v.aiPhrases).toContain('leidenschaftlich');
    expect(v.verbFirstBullets.length).toBe(3);
    expect(v.total).toBe(4);
  });

  it('reports a Nominalstil résumé as clean', () => {
    const p = base();
    p.rewritten_experiences[0].rewritten_achievements = ['Reduktion der Fluktuation um 18 Prozent.'];
    p.rewritten_experiences[1].rewritten_achievements = ['Betreuung von 6 Betten pro Schicht.'];
    p.rewritten_projects[0].rewritten_highlights = ['Schulung von 20 Kolleginnen.'];
    expect(countResumeStyleViolations(p, 'de').total).toBe(0);
  });
});
