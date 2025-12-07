/**
 * Selected experience from candidate profile
 */
export interface SelectedExperience {
  /** Maps to Experience.id in DB (null if synthesized) */
  profileExperienceId: string | null;
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Brief summary (1-2 sentences) */
  summary: string;
  /** Why this experience is relevant for the target job */
  why_relevant: string;
}

/**
 * Selected project from candidate profile
 */
export interface SelectedProject {
  /** Maps to Project.id in DB (null if synthesized) */
  profileProjectId: string | null;
  /** Project name */
  name: string;
  /** Brief summary */
  summary: string;
  /** Why this project is relevant for the target job */
  why_relevant: string;
}

/**
 * Tailored profile output from skill-selector LLM
 * Contains only relevant profile data selected for a specific job posting
 */
export interface TailoredProfileDto {
  /** Target role inferred from job posting */
  target_role: string;
  /** Target company name */
  target_company: string;
  /** Brief reasoning for candidate-job fit (2-3 sentences) */
  reasoning_short: string;
  /** Selected hard skills/technologies (max 12) */
  selected_hard_skills: string[];
  /** Selected soft skills (max 6, only if explicitly required) */
  selected_soft_skills: string[];
  /** Selected tools/platforms (max 8) */
  selected_tools: string[];
  /** Selected relevant experiences (max 5) */
  selected_experiences: SelectedExperience[];
  /** Selected relevant projects (max 5) */
  selected_projects: SelectedProject[];
  /** Selected relevant certificate names */
  selected_certificates: string[];
  /** All education entries (no filtering) */
  selected_education: string[];
}
