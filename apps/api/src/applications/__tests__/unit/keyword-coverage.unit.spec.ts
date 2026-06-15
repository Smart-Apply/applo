import {
  isKeywordPresent,
  selectKeywordsToWeave,
  computePriority1Coverage,
  matchAtsKeywordsToProfile,
  MAX_WEAVE_KEYWORDS,
  type MatchedAtsKeywords,
} from '../../keyword-coverage.util';
import type { ProfileWithRelations } from '../../resume-template.util';

const hard = (
  keyword: string,
  priority?: number,
  source?: 'both' | 'job',
): { keyword: string; priority?: number; source?: 'both' | 'job' } => ({ keyword, priority, source });

const ats = (hard_skills: ReturnType<typeof hard>[]): MatchedAtsKeywords => ({ hard_skills });

function makeProfile(overrides: Partial<ProfileWithRelations> = {}): ProfileWithRelations {
  return {
    summary: '',
    skills: [],
    experiences: [],
    projects: [],
    education: [],
    certificates: [],
    languages: [],
    ...overrides,
  } as unknown as ProfileWithRelations;
}

describe('isKeywordPresent (Unit)', () => {
  it('matches case-insensitively', () => {
    expect(isKeywordPresent('Erfahrung mit Qualitätsmanagement im Team', 'qualitätsmanagement')).toBe(true);
  });

  it('respects word boundaries (no "AWS" inside "laws")', () => {
    expect(isKeywordPresent('We follow all local laws', 'AWS')).toBe(false);
    expect(isKeywordPresent('Deployed on AWS last year', 'AWS')).toBe(true);
  });

  it('handles regex-special keywords (C++, .NET)', () => {
    expect(isKeywordPresent('Built in C++ and shipped', 'C++')).toBe(true);
    expect(isKeywordPresent('A .NET service', '.NET')).toBe(true);
  });

  it('returns false for empty inputs', () => {
    expect(isKeywordPresent('', 'X')).toBe(false);
    expect(isKeywordPresent('text', '')).toBe(false);
  });
});

describe('selectKeywordsToWeave (Unit)', () => {
  it('selects only priority-1 profile-supported keywords missing from the letter', () => {
    const keywords = ats([
      hard('Intensivpflege', 1, 'both'), // supported, missing → weave
      hard('Wundmanagement', 1, 'both'), // supported, present → skip
      hard('Python', 1, 'job'), // priority-1 but NOT supported → never weave
      hard('Teamarbeit', 2, 'both'), // supported but priority-2 → skip
    ]);
    const letter = 'Ich bringe fundiertes Wundmanagement und Führungserfahrung mit.';

    expect(selectKeywordsToWeave(keywords, letter)).toEqual(['Intensivpflege']);
  });

  it('never selects an unsupported (source=job) keyword — no fabrication', () => {
    const keywords = ats([hard('Kubernetes', 1, 'job')]);
    expect(selectKeywordsToWeave(keywords, 'A letter.')).toEqual([]);
  });

  it('caps the number of keywords to keep density natural', () => {
    const keywords = ats(
      Array.from({ length: 8 }, (_, i) => hard(`Skill${i}`, 1, 'both')),
    );
    expect(selectKeywordsToWeave(keywords, 'empty').length).toBe(MAX_WEAVE_KEYWORDS);
  });

  it('deduplicates case-insensitively', () => {
    const keywords = ats([hard('SAP', 1, 'both'), hard('sap', 1, 'both')]);
    expect(selectKeywordsToWeave(keywords, 'letter')).toEqual(['SAP']);
  });

  it('returns [] for null keywords or empty letter', () => {
    expect(selectKeywordsToWeave(null, 'letter')).toEqual([]);
    expect(selectKeywordsToWeave(ats([hard('X', 1, 'both')]), '')).toEqual([]);
  });
});

describe('computePriority1Coverage (Unit)', () => {
  it('counts only priority-1 supported keywords as wanted', () => {
    const keywords = ats([
      hard('Intensivpflege', 1, 'both'), // wanted, present
      hard('Wundmanagement', 1, 'both'), // wanted, missing
      hard('Python', 1, 'job'), // not supported → not wanted
      hard('Teamarbeit', 2, 'both'), // not priority-1 → not wanted
    ]);
    const letter = 'Langjährige Intensivpflege auf der Station.';

    const report = computePriority1Coverage(keywords, letter);
    expect(report.wanted).toBe(2);
    expect(report.covered).toBe(1);
    expect(report.rate).toBe(50);
    expect(report.missing).toEqual(['Wundmanagement']);
  });

  it('reports 100% when there is nothing to cover', () => {
    const report = computePriority1Coverage(ats([hard('Python', 1, 'job')]), 'letter');
    expect(report.wanted).toBe(0);
    expect(report.rate).toBe(100);
  });
});

describe('matchAtsKeywordsToProfile (Unit)', () => {
  it("tags keywords found in the profile as 'both' and others as 'job'", () => {
    const profile = makeProfile({
      skills: [{ id: 's1', name: 'Qualitätsmanagement', level: null }],
      experiences: [
        {
          id: 'e1',
          title: 'Stationsleitung',
          company: 'Klinik',
          description: 'Verantwortung für Intensivpflege',
          achievements: [],
          startDate: new Date(),
          endDate: null,
        },
      ],
    } as unknown as Partial<ProfileWithRelations>);

    const matched = matchAtsKeywordsToProfile(
      { hard_skills: [hard('Qualitätsmanagement', 1), hard('Intensivpflege', 1), hard('Robotik', 2)] },
      profile,
    );

    const bySource = Object.fromEntries(
      (matched.hard_skills || []).map((k) => [k.keyword, k.source]),
    );
    expect(bySource['Qualitätsmanagement']).toBe('both');
    expect(bySource['Intensivpflege']).toBe('both');
    expect(bySource['Robotik']).toBe('job');
  });

  it('deduplicates and prefers both over job', () => {
    const profile = makeProfile({
      skills: [{ id: 's1', name: 'SAP', level: null }],
    } as unknown as Partial<ProfileWithRelations>);

    const matched = matchAtsKeywordsToProfile(
      { hard_skills: [hard('SAP', 1), hard('sap', 1)] },
      profile,
    );
    expect(matched.hard_skills).toHaveLength(1);
    expect(matched.hard_skills?.[0].source).toBe('both');
  });
});
