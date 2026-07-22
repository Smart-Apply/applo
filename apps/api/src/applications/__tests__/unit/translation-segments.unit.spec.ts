import {
  applyTranslatedSegments,
  extractTranslatableSegments,
  isValidSegmentTranslation,
  type TranslatableResume,
} from '../../translation/translation-segments.util';

const resume: TranslatableResume & Record<string, unknown> = {
  candidateName: 'Maria Weber',
  email: 'maria@example.com',
  summary: 'Erfahrene Pflegefachkraft mit 8 Jahren Stationserfahrung.',
  targetJobTitle: 'Stationsleitung',
  skillCategories: [
    { type: 'Fachkompetenzen', skills: ['Wundmanagement', 'Palliativpflege'] },
    { type: '', skills: ['Dokumentation'] },
  ],
  experiences: [
    {
      id: 'exp-1',
      title: 'Pflegefachkraft',
      company: 'Klinikum Duisburg',
      dateRange: 'Okt. 2019 – Heute',
      startDate: '2019-10-01T00:00:00.000Z',
      description: 'Verantwortlich für die Grund- und Behandlungspflege.',
      achievements: ['Einführung eines neuen Wunddokumentationssystems', 'Anleitung von 12 Auszubildenden'],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Digitalisierung der Pflegedokumentation',
      description: 'Umstellung der Station auf digitale Dokumentation.',
      highlights: ['Reduktion des Dokumentationsaufwands um 30 %'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Examinierte Pflegefachkraft',
      institution: 'Pflegeschule Essen',
      year: '2016 – 2019',
      fieldOfStudy: 'Gesundheits- und Krankenpflege',
      description: 'Schwerpunkt Intensivpflege',
    },
  ],
  languages: [
    { name: 'Deutsch', level: 'level.native' },
    { name: 'Englisch', level: 'verhandlungssicher in Wort und Schrift' },
  ],
};

describe('extractTranslatableSegments (Unit)', () => {
  it('extracts display strings with stable path ids', () => {
    const segments = extractTranslatableSegments(resume);
    const ids = segments.map((s) => s.id);
    expect(ids).toEqual([
      'summary',
      'targetJobTitle',
      'skillCat.0.type',
      'exp.0.title',
      'exp.0.description',
      'exp.0.ach.0',
      'exp.0.ach.1',
      'proj.0.name',
      'proj.0.description',
      'proj.0.hl.0',
      'edu.0.degree',
      'edu.0.fieldOfStudy',
      'edu.0.description',
      'lang.0.name',
      'lang.1.name',
      'lang.1.level',
    ]);
  });

  it('never extracts contact data, dates, ids or normalized level keys', () => {
    const texts = extractTranslatableSegments(resume).map((s) => s.text);
    expect(texts).not.toContain('maria@example.com');
    expect(texts).not.toContain('Okt. 2019 – Heute');
    expect(texts).not.toContain('exp-1');
    expect(texts).not.toContain('level.native');
    expect(texts).not.toContain('2016 – 2019');
  });

  it('skips empty skill category names (headerless group)', () => {
    const ids = extractTranslatableSegments(resume).map((s) => s.id);
    expect(ids).not.toContain('skillCat.1.type');
  });
});

describe('isValidSegmentTranslation (Unit)', () => {
  const requested = extractTranslatableSegments(resume);
  const validTranslation = requested.map((s) => ({ id: s.id, text: `EN: ${s.text}` }));

  it('accepts a complete translation', () => {
    expect(isValidSegmentTranslation(requested, validTranslation)).toBe(true);
  });

  it('accepts reordered segments (order-insensitive)', () => {
    expect(isValidSegmentTranslation(requested, [...validTranslation].reverse())).toBe(true);
  });

  it('rejects a dropped segment', () => {
    expect(isValidSegmentTranslation(requested, validTranslation.slice(1))).toBe(false);
  });

  it('rejects an invented segment id', () => {
    const mutated = [...validTranslation];
    mutated[0] = { id: 'exp.99.title', text: 'Nurse' };
    expect(isValidSegmentTranslation(requested, mutated)).toBe(false);
  });

  it('rejects a duplicated segment id', () => {
    const mutated = [...validTranslation];
    mutated[1] = { ...mutated[0] };
    expect(isValidSegmentTranslation(requested, mutated)).toBe(false);
  });

  it('rejects emptied text', () => {
    const mutated = validTranslation.map((s, i) => (i === 0 ? { ...s, text: '  ' } : s));
    expect(isValidSegmentTranslation(requested, mutated)).toBe(false);
  });

  it('rejects non-array and malformed payloads', () => {
    expect(isValidSegmentTranslation(requested, null)).toBe(false);
    expect(isValidSegmentTranslation(requested, { segments: [] })).toBe(false);
    expect(
      isValidSegmentTranslation(
        requested,
        requested.map(() => 'text'),
      ),
    ).toBe(false);
  });
});

describe('applyTranslatedSegments (Unit)', () => {
  it('merges translated text back and leaves everything else untouched', () => {
    const requested = extractTranslatableSegments(resume);
    const translated = requested.map((s) => ({ id: s.id, text: `EN: ${s.text}` }));
    const merged = applyTranslatedSegments(resume, translated);

    expect(merged.summary).toBe('EN: Erfahrene Pflegefachkraft mit 8 Jahren Stationserfahrung.');
    expect(merged.experiences![0].achievements![1]).toBe('EN: Anleitung von 12 Auszubildenden');
    expect(merged.skillCategories![0].type).toBe('EN: Fachkompetenzen');
    expect(merged.languages![1].level).toBe('EN: verhandlungssicher in Wort und Schrift');

    // Untouched: ids, contact, dates, normalized level keys, empty category
    expect((merged.experiences![0] as Record<string, unknown>).id).toBe('exp-1');
    expect((merged as Record<string, unknown>).email).toBe('maria@example.com');
    expect((merged.experiences![0] as Record<string, unknown>).dateRange).toBe('Okt. 2019 – Heute');
    expect(merged.languages![0].level).toBe('level.native');
    expect(merged.skillCategories![1].type).toBe('');

    // Source object not mutated
    expect(resume.summary).toBe('Erfahrene Pflegefachkraft mit 8 Jahren Stationserfahrung.');
  });

  it('ignores out-of-range ids defensively', () => {
    const merged = applyTranslatedSegments(resume, [
      { id: 'exp.5.title', text: 'Ghost' },
      { id: 'exp.0.ach.99', text: 'Ghost' },
      { id: 'unknown.path', text: 'Ghost' },
    ]);
    expect(merged.experiences![0].title).toBe('Pflegefachkraft');
    expect(merged.experiences![0].achievements).toHaveLength(2);
  });
});
