import { ApiProperty } from '@nestjs/swagger';
import type {
  ApplicationValidationResult,
  ApplicationValidationVerdict,
  ApplicationValidationStatus,
  ApplicationValidationCategoryId,
  ApplicationValidationCategory,
  ApplicationValidationIssue,
} from '@smart-apply/shared';

/**
 * Swagger response DTO for `POST /applications/:id/validate`.
 *
 * Shape is the canonical `ApplicationValidationResult` from `@smart-apply/shared`
 * (shared with the web client). This class only exists so the OpenAPI docs
 * describe the payload — the actual object is produced by the LLM under a strict
 * `json_schema` and returned as-is.
 */
class ApplicationValidationCategoryDto implements ApplicationValidationCategory {
  @ApiProperty({
    enum: ['job_match', 'ats_readability', 'impact', 'clarity', 'completeness'],
    example: 'job_match',
  })
  id: ApplicationValidationCategoryId;

  @ApiProperty({ example: 'Passung zur Stelle' })
  label: string;

  @ApiProperty({ example: 85, minimum: 0, maximum: 100 })
  score: number;

  @ApiProperty({ enum: ['pass', 'warn', 'fail'], example: 'pass' })
  status: ApplicationValidationStatus;
}

class ApplicationValidationIssueDto implements ApplicationValidationIssue {
  @ApiProperty({ example: 'Geforderte Qualifikation aufgreifen' })
  title: string;

  @ApiProperty({
    example: "Die Anzeige nennt 'Schichtdienst' als Muss — ergänze dafür einen Beleg.",
  })
  detail: string;
}

export class ApplicationValidationResultDto implements ApplicationValidationResult {
  @ApiProperty({ example: 82, minimum: 0, maximum: 100 })
  overallScore: number;

  @ApiProperty({
    example: 74,
    minimum: 0,
    maximum: 100,
    description: 'Heuristic ATS friendliness estimate (not a real ATS parse)',
  })
  atsScore: number;

  @ApiProperty({ enum: ['strong', 'good', 'needs_work'], example: 'good' })
  verdict: ApplicationValidationVerdict;

  @ApiProperty({ example: 'Starke Passung; das Anschreiben sollte zwei Qualifikationen klarer aufgreifen.' })
  summary: string;

  @ApiProperty({ type: [ApplicationValidationCategoryDto] })
  categories: ApplicationValidationCategoryDto[];

  @ApiProperty({ type: [ApplicationValidationIssueDto] })
  blockers: ApplicationValidationIssueDto[];

  @ApiProperty({ type: [ApplicationValidationIssueDto] })
  recommendations: ApplicationValidationIssueDto[];

  @ApiProperty({ type: [String], example: ['Berufsbezeichnung entspricht exakt der Anzeige'] })
  strengths: string[];

  @ApiProperty({ example: '2026-06-20T16:00:00Z', required: false })
  validatedAt?: string;
}
