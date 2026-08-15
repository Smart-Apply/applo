import type { RewrittenProfileDto } from '../../dto/tailored-profile.dto';
import { generateApplication, type LlmLike } from '../../headless/generate';
import { GroundingValidatorService } from '../../grounding/grounding-validator.service';
import type { ProfileWithRelations } from '../../resume-template.util';

/**
 * Guards two properties of the shared chain's guarded passes:
 *   1. the résumé grounding repair must not spend an LLM call when the
 *      deterministic validator finds nothing to repair;
 *   2. the length governor must fire when the letter overruns its budget.
 *
 * (1) used to poke `GenerationService`'s private `runResumeGroundingRepairPass`.
 * Both passes now live only in the shared v1 chain (`headless/generate.ts`), so
 * the tests assert the same behaviour where the code actually is.
 */
const CLEAN_RESUME: RewrittenProfileDto = {
  rewritten_summary: 'Customer support specialist for complex service enquiries.',
  rewritten_experiences: [
    {
      profileExperienceId: 'exp-support',
      rewritten_description: 'Handled escalated customer cases.',
      rewritten_achievements: ['Improved response quality through a shared workflow.'],
    },
  ],
  rewritten_projects: [],
};

const TAILORED_PROFILE = {
  target_role: 'Customer Support Specialist',
  selected_hard_skills: ['Case management'],
  selected_soft_skills: [],
  selected_tools: [],
  selected_experiences: [{ profileExperienceId: 'exp-support' }],
  selected_projects: [],
  selected_certificates: [],
  selected_education: [],
};

const buildProfile = (): ProfileWithRelations =>
  ({
    summary: null,
    user: { firstName: 'Alex', lastName: 'Meyer', email: 'alex@example.com' },
    experiences: [{ id: 'exp-support', startDate: new Date('2020-01-01'), endDate: null }],
    projects: [],
    education: [],
    certificates: [],
    skills: [],
    languages: [],
  }) as unknown as ProfileWithRelations;

describe('guarded passes in the shared v1 chain', () => {
  it('skips the LLM call when the résumé has no unsupported impact numbers', async () => {
    const callJson = vi.fn(async (templatePath: string) => {
      if (templatePath.endsWith('skill-selector.md')) return TAILORED_PROFILE;
      if (templatePath.endsWith('resume-rewrite.md')) return CLEAN_RESUME;
      return {};
    });
    const llm = {
      callJson,
      callText: vi.fn(async () => ''),
      isFastRouted: () => false,
      defaultModel: 'test-model',
    } as unknown as LlmLike;

    const result = await generateApplication(
      buildProfile(),
      { title: 'Support Specialist', fullText: 'Support role.', language: 'en' },
      {
        language: 'en',
        generateCoverLetter: false,
        toggles: { editorPass: false, styleRewrite: false },
      },
      { llm, grounding: new GroundingValidatorService() },
    );

    expect(result.resume).toBe(CLEAN_RESUME);
    expect(result.guards.resumeGroundingRepair).toBe('skipped');
    const templates = callJson.mock.calls.map(([templatePath]) => templatePath);
    expect(templates).not.toContain('v1/fix-unsupported-numbers-resume.md');
  });

  it('runs the guarded shorten pass when the cover letter overruns its budget', async () => {
    // ~600 body words against the 250-word "kurz" budget.
    const longLetter = `Sehr geehrte Damen und Herren,\n\n${'Wort '.repeat(600)}\n\nMit freundlichen Grüßen`;
    const callJson = vi.fn(async (templatePath: string) => {
      if (templatePath.endsWith('skill-selector.md')) return TAILORED_PROFILE;
      if (templatePath.endsWith('resume-rewrite.md')) return CLEAN_RESUME;
      return {};
    });
    const callText = vi.fn(async () => longLetter);
    const llm = {
      callJson,
      callText,
      isFastRouted: () => false,
      defaultModel: 'test-model',
    } as unknown as LlmLike;

    const result = await generateApplication(
      buildProfile(),
      { title: 'Support Specialist', fullText: 'Support role.', language: 'de' },
      {
        language: 'de',
        generateCoverLetter: true,
        coverLetterLength: 'kurz',
        toggles: { editorPass: false, styleRewrite: false, keywordWeave: false },
      },
      { llm, grounding: new GroundingValidatorService() },
    );

    const templates = callText.mock.calls.map(([templatePath]) => templatePath);
    expect(templates).toContain('v1/shorten-cover-letter.md');
    expect(result.guards.lengthGovernor).not.toBe('skipped');
  });
});
