import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'ID des Job Postings',
    example: 'cmhkpp7xr000he752e3o5s8ut',
  })
  @IsString()
  @IsNotEmpty()
  jobPostingId: string;

  @ApiPropertyOptional({
    description: 'ID der Vorlage für das Anschreiben',
    example: 'professional-cover-letter',
  })
  @IsOptional()
  @IsString()
  coverLetterTemplateId?: string;

  @ApiPropertyOptional({
    description: 'ID der Vorlage für den Lebenslauf',
    example: 'professional-resume',
  })
  @IsOptional()
  @IsString()
  resumeTemplateId?: string;

  @ApiPropertyOptional({
    description: 'Ob ein Anschreiben generiert werden soll',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  generateCoverLetter?: boolean = true;

  @ApiPropertyOptional({
    description:
      'Sprache der Bewerbungsunterlagen (ISO 639-1 Code). Nur de/en — weitere Sprachen ' +
      'werden von der Prompt-Kette nicht unterstützt.',
    example: 'de',
    enum: ['de', 'en'],
    default: 'de',
  })
  @IsOptional()
  @IsString()
  @IsIn(['de', 'en'])
  language?: string = 'de';

  @ApiPropertyOptional({
    description: 'Optionale Notizen zur Bewerbung',
    example: 'Kontakt über Networking Event',
  })
  @IsOptional()
  @Sanitize()
  @IsString()
  notes?: string;
}
