import type { RewrittenProfileDto, TailoredProfileDto } from '../../dto/tailored-profile.dto';
import { GenerationService } from '../../generation.service';
import { GroundingValidatorService } from '../../grounding/grounding-validator.service';
import type { ProfileWithRelations } from '../../resume-template.util';
import type { JobPosting } from '../../../generated/prisma/client';

interface ResumeGroundingRepairAccess {
  runResumeGroundingRepairPass(
    rewrittenProfile: RewrittenProfileDto | null,
    tailoredProfile: TailoredProfileDto,
    profile: ProfileWithRelations,
    language: string,
    userId: string,
    jobPosting: JobPosting,
  ): Promise<RewrittenProfileDto | null>;
}

describe('GenerationService résumé grounding repair', () => {
  it('skips the LLM call when the résumé has no unsupported impact numbers', async () => {
    const callJson = vi.fn();
    const service = new GenerationService(
      null as never,
      { callJson } as never,
      null as never,
      null as never,
      null as never,
      new GroundingValidatorService(),
    ) as unknown as ResumeGroundingRepairAccess;
    const rewrittenProfile: RewrittenProfileDto = {
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
    const profile = {
      summary: null,
      experiences: [],
      projects: [],
      education: [],
      certificates: [],
      skills: [],
      languages: [],
    } as unknown as ProfileWithRelations;

    const result = await service.runResumeGroundingRepairPass(
      rewrittenProfile,
      null as never,
      profile,
      'en',
      'user-1',
      null as never,
    );

    expect(result).toBe(rewrittenProfile);
    expect(callJson).not.toHaveBeenCalled();
  });
});