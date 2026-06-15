import { GroundingValidatorService } from '../../grounding/grounding-validator.service';
import type { ProfileWithRelations } from '../../resume-template.util';

/**
 * Minimal ProfileWithRelations factory. The validator only reads substantive
 * text fields, so we cast a partial object — no Prisma/DB needed.
 */
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

describe('GroundingValidatorService (Unit)', () => {
  let service: GroundingValidatorService;

  beforeEach(() => {
    service = new GroundingValidatorService();
  });

  it('returns grounded with score 100 when output has no impact numbers', () => {
    const profile = makeProfile({ summary: 'Erfahrener Krankenpfleger mit Fokus auf Intensivpflege.' });

    const report = service.validate(
      { coverLetter: '<p>Ich bringe langjährige Erfahrung in der Patientenbetreuung mit.</p>' },
      profile,
    );

    expect(report.grounded).toBe(true);
    expect(report.totalChecked).toBe(0);
    expect(report.score).toBe(100);
    expect(report.unsupported).toHaveLength(0);
  });

  it('flags a fabricated percentage not present in the profile', () => {
    const profile = makeProfile({
      experiences: [
        {
          title: 'Pflegefachkraft',
          company: 'Klinikum Musterstadt',
          description: 'Betreuung von Patient:innen auf der Intensivstation.',
          achievements: [],
          startDate: new Date('2019-01-01'),
          endDate: new Date('2024-01-01'),
        },
      ] as unknown as ProfileWithRelations['experiences'],
    });

    const report = service.validate(
      { coverLetter: '<p>Ich konnte die Wartezeit um 40% reduzieren.</p>' },
      profile,
    );

    expect(report.grounded).toBe(false);
    expect(report.unsupported.map((u) => u.normalized)).toContain('40');
    expect(report.score).toBeLessThan(100);
  });

  it('grounds a percentage that does appear in the profile', () => {
    const profile = makeProfile({
      experiences: [
        {
          title: 'Vertriebsleiter',
          company: 'Beispiel GmbH',
          description: 'Umsatzsteigerung um 40% im ersten Jahr.',
          achievements: ['Senkung der Reklamationsquote um 40%'],
          startDate: new Date('2020-01-01'),
          endDate: null,
        },
      ] as unknown as ProfileWithRelations['experiences'],
    });

    const report = service.validate(
      { coverLetter: '<p>In meiner Rolle steigerte ich den Umsatz um 40%.</p>' },
      profile,
    );

    expect(report.grounded).toBe(true);
    expect(report.score).toBe(100);
  });

  it('flags a fabricated currency amount', () => {
    const profile = makeProfile({ summary: 'Account Executive mit Schwerpunkt Neukundengeschäft.' });

    const report = service.validate(
      { coverLetter: '<p>Ich generierte €120.000 zusätzlichen Umsatz.</p>' },
      profile,
    );

    expect(report.grounded).toBe(false);
    expect(report.unsupported.map((u) => u.normalized)).toContain('120000');
  });

  it('walks resume JSON string values to find fabricated numbers', () => {
    const profile = makeProfile({ summary: 'CNC-Zerspanungsmechaniker.' });

    const resumeJson = JSON.stringify({
      summary: 'Erfahrener Zerspanungsmechaniker.',
      experiences: [
        {
          title: 'Maschinenbediener',
          achievements: ['Reduktion des Ausschusses um 12% durch Prozessoptimierung'],
        },
      ],
    });

    const report = service.validate({ resume: resumeJson }, profile);

    expect(report.grounded).toBe(false);
    expect(report.unsupported.map((u) => u.normalized)).toContain('12');
  });

  it('does not flag small standalone integers like years of experience', () => {
    const profile = makeProfile({ summary: 'Marketing Manager.' });

    const report = service.validate(
      { coverLetter: '<p>Mit 5 Jahren Erfahrung im Content-Marketing.</p>' },
      profile,
    );

    // "5" is a 1-digit number → intentionally not checked.
    expect(report.totalChecked).toBe(0);
    expect(report.grounded).toBe(true);
  });

  it('grounds a large count that appears in the profile', () => {
    const profile = makeProfile({
      projects: [
        {
          name: 'Community Plattform',
          description: 'Plattform mit 2.500 aktiven Nutzern.',
          technologies: [],
          highlights: [],
        },
      ] as unknown as ProfileWithRelations['projects'],
    });

    const report = service.validate(
      { coverLetter: '<p>Die Plattform erreichte 2.500 aktive Nutzer.</p>' },
      profile,
    );

    expect(report.grounded).toBe(true);
  });

  it('does not flag the phone number from the resume JSON contact block', () => {
    const profile = makeProfile({ summary: 'Projektmanager.' });

    // Real-world shape: resumeJson carries contact + ISO dates alongside prose.
    const resumeJson = JSON.stringify({
      candidateName: 'Max Mustermann',
      phone: '+49 151 5905 1609',
      email: 'max@example.com',
      summary: 'Erfahrener Projektmanager.',
      experiences: [
        {
          title: 'Projektleiter',
          company: 'Beispiel GmbH',
          startDate: '2020-01-15T00:00:00.000Z',
          endDate: '2024-03-01T00:00:00.000Z',
          achievements: ['Leitung von Projekten mit positivem Ergebnis'],
        },
      ],
    });

    const report = service.validate({ resume: resumeJson }, profile);

    // Phone digits, ISO timestamps and the date years must NOT be flagged.
    expect(report.grounded).toBe(true);
    expect(report.totalChecked).toBe(0);
  });

  it('does not flag calendar years mentioned in prose', () => {
    const profile = makeProfile({ summary: 'Lehrer mit Schwerpunkt Mathematik.' });

    const report = service.validate(
      { coverLetter: '<p>Seit 2018 unterrichte ich an einer Gesamtschule.</p>' },
      profile,
    );

    expect(report.grounded).toBe(true);
    expect(report.totalChecked).toBe(0);
  });

  it('still flags a fabricated metric that sits inside a prose field of the resume JSON', () => {
    const profile = makeProfile({ summary: 'Vertriebsmitarbeiter.' });

    const resumeJson = JSON.stringify({
      phone: '+49 151 5905 1609',
      summary: 'Vertriebsmitarbeiter.',
      experiences: [
        {
          title: 'Account Manager',
          startDate: '2021-01-01T00:00:00.000Z',
          achievements: ['Steigerung des Umsatzes um 250 % im ersten Jahr'],
        },
      ],
    });

    const report = service.validate({ resume: resumeJson }, profile);

    expect(report.grounded).toBe(false);
    expect(report.unsupported.map((u) => u.normalized)).toContain('250');
  });
});
