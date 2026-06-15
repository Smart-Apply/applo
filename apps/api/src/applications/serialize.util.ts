import type { ProfileWithRelations } from './resume-template.util';

/**
 * Minimal structural shape of a job posting the v1 prompts need. A Prisma
 * `JobPosting` satisfies this, and so do the eval-harness fixtures.
 */
export interface SerializableJobPosting {
  title: string;
  company?: string | null;
  location?: string | null;
  fullText?: string | null;
  language?: string | null;
}

/**
 * Pure serializers that turn a Prisma profile / job posting into the plain JSON
 * shape the v1 LLM prompts consume (`{{json profile}}` / `{{json job}}`).
 *
 * Extracted out of `ApplicationsService` so the offline eval harness
 * (`scripts/eval/**`, item #10) can render the exact same prompt inputs the
 * live `createWithGeneration` pipeline uses — guaranteeing the harness measures
 * the real production prompts and never drifts from them. The service keeps thin
 * private wrappers that delegate here, so existing call sites are unchanged.
 */

/**
 * Serialize profile data for LLM consumption.
 */
export function serializeProfileForLlm(profile: ProfileWithRelations): Record<string, unknown> {
  // Build full address from components
  const addressParts: string[] = [];
  if (profile.street) addressParts.push(profile.street);
  if (profile.postalCode || profile.city) {
    addressParts.push(`${profile.postalCode || ''} ${profile.city || ''}`.trim());
  }
  if (profile.country) addressParts.push(profile.country);
  const fullAddress = addressParts.join(', ');

  return {
    fullName:
      `${profile.user.firstName || ''} ${profile.user.lastName || ''}`.trim() || 'Unknown',
    email: profile.user.email,
    phone: profile.phone || '',
    street: profile.street || '',
    postalCode: profile.postalCode || '',
    city: profile.city || '',
    country: profile.country || '',
    fullAddress: fullAddress || '',
    linkedinUrl: profile.linkedinUrl || '',
    githubUrl: profile.githubUrl || '',
    portfolioUrl: profile.portfolioUrl || '',
    summary: profile.summary || '',
    skills: profile.skills.map((s) => ({ id: s.id, name: s.name, level: s.level })),
    experiences: profile.experiences.map((e) => ({
      id: e.id,
      title: e.title,
      company: e.company,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
      description: e.description || '',
      achievements: e.achievements || [],
    })),
    projects: profile.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      technologies: p.technologies || [],
      highlights: p.highlights || [],
    })),
    education: profile.education.map((ed) => ({
      id: ed.id,
      degree: ed.degree,
      institution: ed.institution,
      startYear: ed.startYear?.toISOString(),
      endYear: ed.endYear?.toISOString(),
    })),
    certificates: profile.certificates.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer || '',
      issueDate: c.issueDate?.toISOString(),
    })),
    languages: profile.languages.map((l) => ({
      id: l.id,
      name: l.name,
      level: l.level,
    })),
  };
}

/**
 * Serialize job posting for LLM consumption.
 */
export function serializeJobPostingForLlm(
  job: SerializableJobPosting,
): Record<string, unknown> {
  return {
    title: job.title,
    company: job.company || '',
    location: job.location || '',
    fullText: job.fullText || '',
    language: job.language || 'en',
  };
}
