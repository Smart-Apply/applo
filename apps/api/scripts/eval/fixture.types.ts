/**
 * Eval-harness fixture schema (item #10).
 *
 * Golden fixtures are authored as plain JSON (no PII — synthetic candidates and
 * job postings) under `scripts/eval/fixtures/`. They use a deliberately *small*
 * shape: only the profile/job fields the v1 prompts actually consume. The
 * `hydrateProfile` helper expands a fixture into a `ProfileWithRelations` (the
 * exact type the live `serializeProfileForLlm` + `GroundingValidatorService`
 * accept), filling synthetic ids/dates so the harness measures the real
 * production prompts without touching the database.
 *
 * This file lives under `scripts/` (not `src/`), so it is intentionally outside
 * the eslint + nest-build scope and runs only via ts-node.
 */
import type { ProfileWithRelations } from '../../src/applications/resume-template.util';
import type { SerializableJobPosting } from '../../src/applications/serialize.util';

export type EvalLanguage = 'de' | 'en';

export interface EvalFixtureSkill {
  name: string;
  level?: string;
}

export interface EvalFixtureExperience {
  title: string;
  company: string;
  /** ISO date string, e.g. "2019-03-01" or year-only "2019". */
  startDate: string;
  /** ISO date string, or null/omitted for an ongoing role. */
  endDate?: string | null;
  description?: string;
  achievements?: string[];
}

export interface EvalFixtureProject {
  name: string;
  description?: string;
  technologies?: string[];
  highlights?: string[];
}

export interface EvalFixtureEducation {
  degree: string;
  institution: string;
  startYear?: string | null;
  endYear?: string | null;
}

export interface EvalFixtureCertificate {
  name: string;
  issuer?: string;
  issueDate?: string | null;
}

export interface EvalFixtureLanguage {
  name: string;
  level?: string;
}

export interface EvalFixtureProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary: string;
  skills: EvalFixtureSkill[];
  experiences: EvalFixtureExperience[];
  projects?: EvalFixtureProject[];
  education?: EvalFixtureEducation[];
  certificates?: EvalFixtureCertificate[];
  languages?: EvalFixtureLanguage[];
}

export interface EvalFixtureJob extends SerializableJobPosting {
  /** Required for fixtures (the prompts always receive a title). */
  title: string;
  /** Required for fixtures so language detection / output language is stable. */
  language: EvalLanguage;
  /** The full job-posting text the prompts scan for keywords + company facts. */
  fullText: string;
}

export interface EvalFixture {
  /** Stable id, also the filename stem, e.g. "healthcare-de". */
  id: string;
  /** Human-readable profession label for grouping the report. */
  profession: string;
  /** Output language the prompts should produce. */
  language: EvalLanguage;
  profile: EvalFixtureProfile;
  jobPosting: EvalFixtureJob;
}

/** Parse an ISO date (or year-only) string into a Date, or null. */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Expand a JSON fixture profile into a `ProfileWithRelations`. We populate the
 * fields the v1 serializer + grounding validator read and cast once at the
 * boundary — enumerating every Prisma column here would add noise without
 * changing what the prompts see.
 */
export function hydrateProfile(fixture: EvalFixture): ProfileWithRelations {
  const p = fixture.profile;
  const now = new Date();

  const hydrated = {
    id: `${fixture.id}-profile`,
    userId: `${fixture.id}-user`,
    phone: p.phone ?? null,
    street: p.street ?? null,
    postalCode: p.postalCode ?? null,
    city: p.city ?? null,
    country: p.country ?? null,
    linkedinUrl: p.linkedinUrl ?? null,
    githubUrl: p.githubUrl ?? null,
    portfolioUrl: p.portfolioUrl ?? null,
    summary: p.summary ?? null,
    createdAt: now,
    updatedAt: now,
    user: {
      id: `${fixture.id}-user`,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
    },
    skills: p.skills.map((s, i) => ({
      id: `${fixture.id}-skill-${i}`,
      name: s.name,
      level: s.level ?? null,
    })),
    experiences: p.experiences.map((e, i) => ({
      id: `${fixture.id}-exp-${i}`,
      title: e.title,
      company: e.company,
      startDate: toDate(e.startDate) ?? now,
      endDate: toDate(e.endDate ?? null),
      description: e.description ?? null,
      achievements: e.achievements ?? [],
    })),
    projects: (p.projects ?? []).map((pr, i) => ({
      id: `${fixture.id}-proj-${i}`,
      name: pr.name,
      description: pr.description ?? null,
      technologies: pr.technologies ?? [],
      highlights: pr.highlights ?? [],
    })),
    education: (p.education ?? []).map((ed, i) => ({
      id: `${fixture.id}-edu-${i}`,
      degree: ed.degree,
      institution: ed.institution,
      startYear: toDate(ed.startYear ?? null),
      endYear: toDate(ed.endYear ?? null),
    })),
    certificates: (p.certificates ?? []).map((c, i) => ({
      id: `${fixture.id}-cert-${i}`,
      name: c.name,
      issuer: c.issuer ?? null,
      issueDate: toDate(c.issueDate ?? null),
    })),
    languages: (p.languages ?? []).map((l, i) => ({
      id: `${fixture.id}-lang-${i}`,
      name: l.name,
      level: l.level ?? null,
    })),
  };

  return hydrated as unknown as ProfileWithRelations;
}
