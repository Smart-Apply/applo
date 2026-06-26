import {
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
});
