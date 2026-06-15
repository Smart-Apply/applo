import {
  mapStoredResumeToTailoredProfile,
  type StoredResume,
} from '../../stored-resume.util';
import type {
  SelectedCertificate,
  SelectedEducation,
  SelectedLanguage,
  SelectedProject,
} from '../../dto/tailored-profile.dto';

const job = { title: 'Pflegefachkraft', company: 'Klinikum München' };

describe('mapStoredResumeToTailoredProfile (Unit, #2)', () => {
  it('maps target role/company from the job posting', () => {
    const result = mapStoredResumeToTailoredProfile({}, job);
    expect(result.target_role).toBe('Pflegefachkraft');
    expect(result.target_company).toBe('Klinikum München');
  });

  it('flattens, trims and de-dupes skills across categories (case-insensitive)', () => {
    const resume: StoredResume = {
      skillCategories: [
        { type: 'Core', skills: ['  Wundversorgung ', 'Teamführung'] },
        { type: 'Tools', skills: ['wundversorgung', 'Dokumentation', ''] },
      ],
    };
    const result = mapStoredResumeToTailoredProfile(resume, job);
    expect(result.selected_hard_skills).toEqual([
      'Wundversorgung',
      'Teamführung',
      'Dokumentation',
    ]);
  });

  it('caps hard skills at 12', () => {
    const resume: StoredResume = {
      skillCategories: [
        { type: 'Core', skills: Array.from({ length: 20 }, (_, i) => `Skill${i}`) },
      ],
    };
    const result = mapStoredResumeToTailoredProfile(resume, job);
    expect(result.selected_hard_skills).toHaveLength(12);
  });

  it('maps experiences with null profile IDs and surfaces achievements in why_relevant', () => {
    const resume: StoredResume = {
      experiences: [
        {
          title: 'Stationsleitung',
          company: 'St. Marien',
          description: 'Leitung einer Pflegestation.',
          achievements: ['Fehlzeiten um 20% gesenkt', 'Team von 15 geführt'],
        },
      ],
    };
    const [exp] = mapStoredResumeToTailoredProfile(resume, job).selected_experiences;
    expect(exp.profileExperienceId).toBeNull();
    expect(exp.title).toBe('Stationsleitung');
    expect(exp.company).toBe('St. Marien');
    expect(exp.summary).toBe('Leitung einer Pflegestation.');
    expect(exp.why_relevant).toBe('Fehlzeiten um 20% gesenkt; Team von 15 geführt');
  });

  it('falls back to achievements for the summary when no description exists', () => {
    const resume: StoredResume = {
      experiences: [
        {
          title: 'Pflegekraft',
          company: 'Klinik',
          achievements: ['24/7 Patientenbetreuung', 'Notfallmanagement'],
        },
      ],
    };
    const [exp] = mapStoredResumeToTailoredProfile(resume, job).selected_experiences;
    expect(exp.summary).toBe('24/7 Patientenbetreuung Notfallmanagement');
    expect(exp.why_relevant).toBe('');
  });

  it('drops experiences with neither title nor company and caps at 5', () => {
    const resume: StoredResume = {
      experiences: [
        {},
        ...Array.from({ length: 7 }, (_, i) => ({ title: `Role ${i}`, company: 'Co' })),
      ],
    };
    const result = mapStoredResumeToTailoredProfile(resume, job);
    expect(result.selected_experiences).toHaveLength(5);
  });

  it('maps projects with null profile IDs and highlights in why_relevant', () => {
    const resume: StoredResume = {
      projects: [
        {
          name: 'Digitale Patientenakte',
          description: 'Einführung eines EPA-Systems.',
          highlights: ['100% papierlos', '3 Monate früher fertig'],
        },
      ],
    };
    const [project] = mapStoredResumeToTailoredProfile(resume, job)
      .selected_projects as SelectedProject[];
    expect(project.profileProjectId).toBeNull();
    expect(project.name).toBe('Digitale Patientenakte');
    expect(project.summary).toBe('Einführung eines EPA-Systems.');
    expect(project.why_relevant).toBe('100% papierlos; 3 Monate früher fertig');
  });

  it('maps certificates, education (year → endYear) and languages structurally', () => {
    const resume: StoredResume = {
      certifications: [{ name: 'BLS', issuer: 'AHA', date: '2023' }],
      education: [
        {
          degree: 'B.Sc. Pflege',
          institution: 'Hochschule München',
          year: '2020',
          fieldOfStudy: 'Pflegewissenschaft',
        },
      ],
      languages: [{ name: 'Deutsch', level: 'Muttersprache' }, { name: 'Englisch' }],
    };
    const result = mapStoredResumeToTailoredProfile(resume, job);

    const cert = result.selected_certificates[0] as SelectedCertificate;
    expect(cert).toMatchObject({
      profileCertificateId: null,
      name: 'BLS',
      issuer: 'AHA',
      issueDate: '2023',
    });

    const edu = result.selected_education[0] as SelectedEducation;
    expect(edu).toMatchObject({
      profileEducationId: null,
      degree: 'B.Sc. Pflege',
      institution: 'Hochschule München',
      fieldOfStudy: 'Pflegewissenschaft',
      startYear: null,
      endYear: '2020',
    });

    const langs = result.selected_languages as SelectedLanguage[];
    expect(langs[0]).toEqual({ name: 'Deutsch', level: 'Muttersprache' });
    expect(langs[1]).toEqual({ name: 'Englisch', level: undefined });
  });

  it('returns empty collections (not undefined) for an empty resume', () => {
    const result = mapStoredResumeToTailoredProfile({}, job);
    expect(result.selected_hard_skills).toEqual([]);
    expect(result.selected_soft_skills).toEqual([]);
    expect(result.selected_tools).toEqual([]);
    expect(result.selected_experiences).toEqual([]);
    expect(result.selected_projects).toEqual([]);
    expect(result.selected_certificates).toEqual([]);
    expect(result.selected_education).toEqual([]);
    expect(result.selected_languages).toEqual([]);
    expect(result.reasoning_short).toBe('');
  });

  it('tolerates missing title/company on the job posting', () => {
    const result = mapStoredResumeToTailoredProfile({}, {});
    expect(result.target_role).toBe('');
    expect(result.target_company).toBe('');
  });
});
