/**
 * Edit-mode cover-letter regeneration (#2): map the editor-saved resume JSON
 * (`Application.resumeText`) back into the `TailoredProfileDto` shape that the
 * v1 generation prompts consume.
 *
 * The initial-generation pipeline produces a cover letter from a
 * skill-selector `TailoredProfileDto`. When the user later hits "regenerate
 * cover letter" in the editor we no longer have that object — only the already
 * tailored resume they have been editing. This pure mapper lets the edit-mode
 * path reuse `v1/cover-letter.md` (same prompt, same #1/#5/#6 quality) instead
 * of the retired `cover-letter-ats.md`, without an extra skill-selector LLM call.
 *
 * Pure + dependency-free so the mapping is unit-testable without Nest/Prisma.
 */
import {
  SelectedCertificate,
  SelectedEducation,
  SelectedExperience,
  SelectedLanguage,
  SelectedProject,
  TailoredProfileDto,
} from './dto/tailored-profile.dto';

/** A single skill grouping as stored in the editor resume JSON. */
export interface StoredResumeSkillCategory {
  type?: string;
  skills?: string[];
}

/** An experience entry as stored in the editor resume JSON. */
export interface StoredResumeExperience {
  title?: string;
  company?: string;
  location?: string | null;
  dateRange?: string;
  description?: string | null;
  achievements?: string[];
}

/** A project entry as stored in the editor resume JSON. */
export interface StoredResumeProject {
  name?: string;
  description?: string | null;
  date?: string | null;
  highlights?: string[];
}

/** An education entry as stored in the editor resume JSON. */
export interface StoredResumeEducation {
  degree?: string;
  institution?: string;
  year?: string;
  fieldOfStudy?: string | null;
  gpa?: string | null;
  description?: string | null;
}

/** A certificate entry as stored in the editor resume JSON. */
export interface StoredResumeCertificate {
  name?: string;
  issuer?: string;
  date?: string | null;
}

/** A language entry as stored in the editor resume JSON. */
export interface StoredResumeLanguage {
  name?: string;
  level?: string;
}

/**
 * Shape of the JSON persisted in `Application.resumeText` (the editor resume).
 * Mirrors `normalizeResumeData` in `applications.service.ts`; every field is
 * optional because this is parsed from a stored string and must stay tolerant.
 */
export interface StoredResume {
  candidateName?: string;
  summary?: string | null;
  skillCategories?: StoredResumeSkillCategory[];
  experiences?: StoredResumeExperience[];
  projects?: StoredResumeProject[];
  education?: StoredResumeEducation[];
  certifications?: StoredResumeCertificate[];
  languages?: StoredResumeLanguage[];
}

// Caps mirror the skill-selector validation in `llm.service.ts` so the mapped
// profile never exceeds what the prompts are tuned for.
const MAX_HARD_SKILLS = 12;
const MAX_EXPERIENCES = 5;
const MAX_PROJECTS = 5;

const str = (value?: string | null): string => (value ?? '').trim();
const cleanList = (items?: string[]): string[] =>
  (items ?? []).map((item) => str(item)).filter(Boolean);

/** Case-insensitive de-dupe that preserves first-seen order and original casing. */
function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/**
 * Map a stored editor resume into a `TailoredProfileDto` for the v1 cover-letter
 * prompt. The resume is already tailored, so there is no skill-selector
 * reasoning to carry: `reasoning_short` is empty and `why_relevant` surfaces the
 * achievements/highlights (the quantified results the cover letter should cite).
 */
export function mapStoredResumeToTailoredProfile(
  resume: StoredResume,
  jobPosting: { title?: string | null; company?: string | null },
): TailoredProfileDto {
  const hardSkills = dedupe(
    (resume.skillCategories ?? []).flatMap((category) => cleanList(category.skills)),
  ).slice(0, MAX_HARD_SKILLS);

  const experiences: SelectedExperience[] = (resume.experiences ?? [])
    .filter((exp) => str(exp.title) || str(exp.company))
    .slice(0, MAX_EXPERIENCES)
    .map((exp) => {
      const description = str(exp.description);
      const achievements = cleanList(exp.achievements);
      return {
        profileExperienceId: null,
        title: str(exp.title),
        company: str(exp.company),
        // Surface every bit of content: prefer the description, fall back to the
        // achievements when there is none, and keep the metrics in why_relevant.
        summary: description || achievements.join(' '),
        why_relevant: description ? achievements.join('; ') : '',
      };
    });

  const projects: SelectedProject[] = (resume.projects ?? [])
    .filter((project) => str(project.name))
    .slice(0, MAX_PROJECTS)
    .map((project) => {
      const description = str(project.description);
      const highlights = cleanList(project.highlights);
      return {
        profileProjectId: null,
        name: str(project.name),
        summary: description || highlights.join(' '),
        why_relevant: description ? highlights.join('; ') : '',
      };
    });

  const certificates: SelectedCertificate[] = (resume.certifications ?? [])
    .filter((cert) => str(cert.name))
    .map((cert) => ({
      profileCertificateId: null,
      name: str(cert.name),
      issuer: str(cert.issuer),
      issueDate: str(cert.date) || null,
    }));

  const education: SelectedEducation[] = (resume.education ?? [])
    .filter((edu) => str(edu.degree) || str(edu.institution))
    .map((edu) => ({
      profileEducationId: null,
      degree: str(edu.degree),
      institution: str(edu.institution),
      fieldOfStudy: str(edu.fieldOfStudy) || null,
      startYear: null,
      endYear: str(edu.year) || null,
      gpa: str(edu.gpa) || null,
      description: str(edu.description) || null,
    }));

  const languages: SelectedLanguage[] = (resume.languages ?? [])
    .filter((lang) => str(lang.name))
    .map((lang) => ({
      name: str(lang.name),
      level: str(lang.level) || undefined,
    }));

  return {
    target_role: str(jobPosting.title),
    target_company: str(jobPosting.company),
    reasoning_short: '',
    selected_hard_skills: hardSkills,
    selected_soft_skills: [],
    selected_tools: [],
    selected_experiences: experiences,
    selected_projects: projects,
    selected_certificates: certificates,
    selected_education: education,
    selected_languages: languages,
  };
}
