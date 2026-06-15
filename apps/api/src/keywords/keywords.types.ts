/**
 * Keyword + profile shapes used by the deterministic ATS keyword analysis.
 *
 * These were historically defined in `src/agents/agents.interface.ts` alongside
 * the (now-retired) Azure AI Foundry agent classes, but they are live: the
 * keywords service uses them for the `v1/ats-keywords-extract.md` extraction and
 * profile-keyword analysis, and the applications service uses `ATSAgentOutput`
 * in its match-analysis path. They were moved here when the dead agent classes
 * were deleted (roadmap #2).
 */

/**
 * Extracted ATS keywords, grouped by category (domain-neutral names).
 */
export interface ATSAgentOutput {
  coreCompetencies: string[]; // Core skills (profession-specific)
  softSkills: string[];
  responsibilityKeywords: string[];
  requirementKeywords: string[];
  methodologies: string[]; // Methods, tools, frameworks
  industryKeywords: string[];
  senioritySignals: string[];
  miscKeywords: string[];
}

/**
 * Profile data structure consumed by keyword analysis.
 */
export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  summary?: string;
  skills: {
    id: string;
    name: string;
    level?: string;
  }[];
  experiences: {
    id: string;
    title: string;
    company: string;
    location?: string;
    startDate: Date;
    endDate?: Date;
    current: boolean;
    description?: string;
  }[];
  education: {
    id: string;
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    startDate?: Date;
    endDate?: Date;
  }[];
  certificates: {
    id: string;
    name: string;
    issuer: string;
    issueDate?: Date;
    expiryDate?: Date;
  }[];
  projects: {
    id: string;
    name: string;
    description?: string;
    url?: string;
    technologies: string[];
  }[];
  languages: {
    id: string;
    name: string;
    level: string;
  }[];
}
