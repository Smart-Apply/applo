/**
 * Single ATS keyword with metadata
 */
export interface AtsKeywordDto {
  /** The keyword term */
  keyword: string;
  /** Source of keyword match */
  source: 'job' | 'profile' | 'both';
  /** Priority level (1=must-have, 2=important, 3=nice-to-have) */
  priority: 1 | 2 | 3;
}

/**
 * ATS keywords output categorized by type
 * Total keywords across all categories must be <= 20
 */
export interface AtsKeywordsOutputDto {
  /** Hard skills (programming languages, methodologies, etc.) */
  hard_skills: AtsKeywordDto[];
  /** Tools and technologies (frameworks, platforms, software) */
  tools_and_tech: AtsKeywordDto[];
  /** Domain/industry keywords */
  domains: AtsKeywordDto[];
  /** Methodologies (Agile, Scrum, CI/CD, etc.) */
  methodologies: AtsKeywordDto[];
}
