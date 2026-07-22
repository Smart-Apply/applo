import type { ResponseFormat } from '../llm.interface';

/**
 * JSON schemas for Azure OpenAI structured outputs (#8).
 *
 * These constrain the JSON-producing v1 prompts so the model returns
 * schema-valid output by construction, instead of relying on the regex/fence
 * repair in `LLMService.parseJsonResponse`. The regex path is kept as a fallback
 * for providers/api-versions that ignore `response_format`.
 *
 * Only **union-free** shapes get a strict schema:
 * - `ats-keywords` — clean `{ hard_skills, soft_skills }` of `{ keyword, priority }`.
 * - `resume-rewrite` — clean nested objects; strict mode also reinforces the
 *   critical `profileExperienceId` / `profileProjectId` preservation.
 *
 * `skill-selector` is intentionally NOT strict-schema'd: its `TailoredProfileDto`
 * has `(string | object)[]` union fields that strict mode can't model cleanly.
 * It uses JSON mode (`{ type: 'json_object' }`) instead — clean JSON without
 * shape enforcement.
 *
 * Strict-mode rules honoured below: every object sets `additionalProperties:
 * false` and lists every property in `required`.
 */

const atsKeywordItem = {
  type: 'object',
  additionalProperties: false,
  required: ['keyword', 'priority'],
  properties: {
    keyword: { type: 'string' },
    priority: { type: 'integer', enum: [1, 2, 3] },
  },
} as const;

const atsKeywordsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['hard_skills', 'soft_skills'],
  properties: {
    hard_skills: { type: 'array', items: atsKeywordItem },
    soft_skills: { type: 'array', items: atsKeywordItem },
  },
} as const;

const resumeRewriteSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['rewritten_summary', 'rewritten_experiences', 'rewritten_projects'],
  properties: {
    rewritten_summary: { type: 'string' },
    rewritten_experiences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['profileExperienceId', 'rewritten_description', 'rewritten_achievements'],
        properties: {
          profileExperienceId: { type: 'string' },
          rewritten_description: { type: 'string' },
          rewritten_achievements: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    rewritten_projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['profileProjectId', 'rewritten_description', 'rewritten_highlights'],
        properties: {
          profileProjectId: { type: 'string' },
          rewritten_description: { type: 'string' },
          rewritten_highlights: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

const jobFactsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'contact_name',
    'contact_salutation',
    'company_specifics',
    'asks_salary',
    'asks_start_date',
  ],
  properties: {
    contact_name: { type: 'string' },
    contact_salutation: { type: 'string' },
    company_specifics: { type: 'array', items: { type: 'string' } },
    asks_salary: { type: 'boolean' },
    asks_start_date: { type: 'boolean' },
  },
} as const;

const translateResumeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['segments'],
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'text'],
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
        },
      },
    },
  },
} as const;

const applicationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'overallScore',
    'atsScore',
    'verdict',
    'summary',
    'categories',
    'blockers',
    'recommendations',
    'strengths',
  ],
  properties: {
    overallScore: { type: 'integer', minimum: 0, maximum: 100 },
    atsScore: { type: 'integer', minimum: 0, maximum: 100 },
    verdict: { type: 'string', enum: ['strong', 'good', 'needs_work'] },
    summary: { type: 'string' },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'score', 'status'],
        properties: {
          id: {
            type: 'string',
            enum: ['job_match', 'ats_readability', 'impact', 'clarity', 'completeness'],
          },
          label: { type: 'string' },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          status: { type: 'string', enum: ['pass', 'warn', 'fail'] },
        },
      },
    },
    blockers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    strengths: { type: 'array', items: { type: 'string' } },
  },
} as const;

/**
 * Registry mapping a prompt template path (suffix-matched) to the strict JSON
 * schema that constrains its output. Consulted by `LLMService.callJson` so call
 * sites need no changes and the eval harness exercises the identical path.
 */
const SCHEMA_REGISTRY: { match: string; name: string; schema: Record<string, unknown> }[] = [
  { match: 'v1/ats-keywords.md', name: 'ats_keywords', schema: atsKeywordsSchema },
  { match: 'v1/resume-rewrite.md', name: 'resume_rewrite', schema: resumeRewriteSchema },
  { match: 'v1/resume-style-rewrite.md', name: 'resume_style_rewrite', schema: resumeRewriteSchema },
  { match: 'v1/job-facts.md', name: 'job_facts', schema: jobFactsSchema },
  { match: 'v1/translate-resume.md', name: 'translate_resume', schema: translateResumeSchema },
  {
    match: 'v1/application-validation.md',
    name: 'application_validation',
    schema: applicationValidationSchema,
  },
];

/**
 * Resolve the `response_format` for a JSON call:
 * - a strict `json_schema` when the template has a registered schema,
 * - else JSON mode (`json_object`) when the rendered prompt mentions "json"
 *   (Azure requires the literal word for json_object mode),
 * - else `undefined` (no structured-output hint).
 */
export function resolveResponseFormat(
  templatePath: string,
  renderedPrompt: string,
): ResponseFormat | undefined {
  const entry = SCHEMA_REGISTRY.find((s) => templatePath.includes(s.match));
  if (entry) {
    return {
      type: 'json_schema',
      json_schema: { name: entry.name, strict: true, schema: entry.schema },
    };
  }
  if (/\bjson\b/i.test(renderedPrompt)) {
    return { type: 'json_object' };
  }
  return undefined;
}

export const __testSchemas = {
  atsKeywordsSchema,
  resumeRewriteSchema,
  jobFactsSchema,
  translateResumeSchema,
  applicationValidationSchema,
};
