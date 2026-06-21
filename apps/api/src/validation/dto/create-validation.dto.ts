import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

// Document-sized caps (these are full documents, not short AI instructions, so
// the per-surface AI prompt guardrail limits don't apply). Generous but bounded.
const RESUME_MAX = 24000;
const COVER_LETTER_MAX = 12000;
const JOB_CONTEXT_MAX = 24000;

/**
 * Input for a standalone application check (`POST /validation`): the user's own
 * externally-created application. Only the résumé is required.
 */
export class CreateValidationDto {
  @ApiProperty({
    description: 'The résumé / CV as plain text (pasted or extracted from a file).',
    example: 'Max Mustermann\nKrankenpfleger\n...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Bitte füge deinen Lebenslauf ein.' })
  @MinLength(50, { message: 'Der Lebenslauf ist zu kurz für eine aussagekräftige Prüfung.' })
  @MaxLength(RESUME_MAX, { message: 'Der Lebenslauf ist zu lang.' })
  @Sanitize()
  resumeText: string;

  @ApiPropertyOptional({ description: 'Optional cover letter text.' })
  @IsOptional()
  @IsString()
  @MaxLength(COVER_LETTER_MAX, { message: 'Das Anschreiben ist zu lang.' })
  @Sanitize()
  coverLetterText?: string;

  @ApiPropertyOptional({
    description: 'Optional target role and/or pasted job posting to evaluate fit against.',
    example: 'Stationsleitung Pflege, Vollzeit, Erfahrung mit Dienstplanung',
  })
  @IsOptional()
  @IsString()
  @MaxLength(JOB_CONTEXT_MAX, { message: 'Der Stellen-Kontext ist zu lang.' })
  @Sanitize()
  jobContext?: string;

  @ApiPropertyOptional({
    description: 'Optional language override (ISO 639-1). Inferred from the résumé when omitted.',
    example: 'de',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  @Sanitize()
  language?: string;

  @ApiPropertyOptional({ description: 'Optional user-facing label for this check.' })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Der Titel ist zu lang.' })
  @Sanitize()
  title?: string;
}
