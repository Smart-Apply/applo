import type { RewrittenProfileDto } from '../../dto/tailored-profile.dto';
import {
  evaluateResumeGroundingRepair,
  type ResumeGroundingRepairEvaluation,
} from '../../grounding/grounding-repair.util';
import type { GroundingFinding } from '../../grounding/grounding-validator.service';

const finding = (value: string, normalized: string): GroundingFinding => ({
  value,
  normalized,
  context: `Result ${value}`,
});

const resume = (): RewrittenProfileDto => ({
  rewritten_summary: 'Customer support specialist with experience in complex enquiries.',
  rewritten_experiences: [
    {
      profileExperienceId: 'exp-support',
      rewritten_description: 'Handled escalated customer cases.',
      rewritten_achievements: ['Reduced response time by 40%.'],
    },
  ],
  rewritten_projects: [
    {
      profileProjectId: 'project-helpdesk',
      rewritten_description: 'Introduced a shared helpdesk workflow.',
      rewritten_highlights: ['Supported a 5,000+ customer base.'],
    },
  ],
});

function expectRejected(
  evaluation: ResumeGroundingRepairEvaluation,
  reason: ResumeGroundingRepairEvaluation['reason'],
): void {
  expect(evaluation.accept).toBe(false);
  expect(evaluation.reason).toBe(reason);
}

describe('evaluateResumeGroundingRepair', () => {
  const unsupportedBefore = [finding('40%', '40'), finding('5,000+', '5000')];

  it('accepts an ID-preserving candidate with fewer unsupported claims', () => {
    const repaired = resume();
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Measurably reduced response time.',
    ];
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expect(
      evaluateResumeGroundingRepair(resume(), repaired, unsupportedBefore, [], 'en'),
    ).toEqual({
      accept: true,
      reason: 'repaired',
      unsupportedBefore: 2,
      unsupportedAfter: 0,
    });
  });

  it('rejects a mangled profileExperienceId', () => {
    const repaired = resume();
    repaired.rewritten_experiences[0].profileExperienceId = 'exp-mangled';

    expectRejected(
      evaluateResumeGroundingRepair(resume(), repaired, unsupportedBefore, [], 'en'),
      'invalid',
    );
  });

  it('rejects a locally gutted field even when structure and ids remain valid', () => {
    const repaired = resume();
    repaired.rewritten_experiences[0].rewritten_achievements = ['x'];
    repaired.rewritten_projects[0].rewritten_highlights = ['Supported a large customer base.'];

    expectRejected(
      evaluateResumeGroundingRepair(resume(), repaired, unsupportedBefore, [], 'en'),
      'gutted',
    );
  });

  it('rejects changes to unflagged prose fields', () => {
    const repaired = resume();
    repaired.rewritten_summary = 'Completely rewritten summary.';
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Measurably reduced response time.',
    ];
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expectRejected(
      evaluateResumeGroundingRepair(resume(), repaired, unsupportedBefore, [], 'en'),
      'scope-expanded',
    );
  });

  it('rejects changed achievement cardinality', () => {
    const repaired = resume();
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Measurably reduced response time.',
      'Added an unrelated achievement.',
    ];
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expectRejected(
      evaluateResumeGroundingRepair(resume(), repaired, unsupportedBefore, [], 'en'),
      'scope-expanded',
    );
  });

  it('rejects a candidate that does not strictly reduce unsupported claims', () => {
    expectRejected(
      evaluateResumeGroundingRepair(
        resume(),
        resume(),
        unsupportedBefore,
        unsupportedBefore,
        'en',
      ),
      'not-cleaner',
    );
  });

  it('rejects replacing flagged values with a new fabrication', () => {
    const repaired = resume();
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Reduced response time by 25%.',
    ];
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expectRejected(
      evaluateResumeGroundingRepair(
        resume(),
        repaired,
        unsupportedBefore,
        [finding('25%', '25')],
        'en',
      ),
      'new-fabrication',
    );
  });

  it('rejects a new number even when the profile-wide validator considers it grounded', () => {
    const repaired = resume();
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Reduced response time by 25%.',
    ];
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expectRejected(
      evaluateResumeGroundingRepair(resume(), repaired, unsupportedBefore, [], 'en'),
      'new-fabrication',
    );
  });

  it('rejects moving an existing number from another résumé field', () => {
    const original = resume();
    original.rewritten_projects[0].rewritten_description =
      'Introduced a shared helpdesk workflow used in 25% of cases.';
    const repaired = structuredClone(original);
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Reduced response time by 25%.',
    ];
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expectRejected(
      evaluateResumeGroundingRepair(original, repaired, unsupportedBefore, [], 'en'),
      'new-fabrication',
    );
  });

  it('does not treat an overlapping numeric suffix as the flagged value', () => {
    const original = resume();
    original.rewritten_projects[0].rewritten_description =
      'Improved workflow adoption by 140%.';
    const repaired = structuredClone(original);
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Measurably reduced response time.',
    ];
    repaired.rewritten_projects[0].rewritten_description =
      'Improved workflow adoption substantially.';
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expectRejected(
      evaluateResumeGroundingRepair(original, repaired, unsupportedBefore, [], 'en'),
      'scope-expanded',
    );
  });

  it('rejects a cleaner candidate that increases style violations', () => {
    const repaired = resume();
    repaired.rewritten_experiences[0].rewritten_achievements = [
      'Passionate about measurably reducing response time.',
    ];
    repaired.rewritten_projects[0].rewritten_highlights = [
      'Supported a large customer base.',
    ];

    expectRejected(
      evaluateResumeGroundingRepair(resume(), repaired, unsupportedBefore, [], 'en'),
      'style-regressed',
    );
  });
});