/**
 * Grounding wrapper for the eval harness (item #10).
 *
 * Reuses the deterministic `GroundingValidatorService` (#7) exactly as the live
 * pipeline does. The service has no constructor dependencies, so we instantiate
 * it directly.
 */
import { GroundingValidatorService } from '../../src/applications/grounding/grounding-validator.service';
import type { GroundingReport } from '../../src/applications/grounding/grounding-validator.service';
import { hydrateProfile, type EvalFixture } from './fixture.types';
import type { GeneratedDocuments } from './pipeline-runner';

const validator = new GroundingValidatorService();

export function groundDocuments(
  fixture: EvalFixture,
  docs: GeneratedDocuments,
): GroundingReport {
  const profile = hydrateProfile(fixture);
  return validator.validate(
    { resume: docs.resumeJsonForGrounding, coverLetter: docs.coverLetter },
    profile,
  );
}
