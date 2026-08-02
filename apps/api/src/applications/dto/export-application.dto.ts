import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportApplicationDto {
  @ApiPropertyOptional({
    description:
      'Language for PDF generation (ISO 639-1 code). Content generated in another language ' +
      'is translated automatically on export via the guarded translation pass (dates and ' +
      'section headers deterministically, prose via LLM with fallback to the source language).',
    example: 'de',
    enum: ['de', 'en', 'fr', 'es', 'pt', 'it'],
  })
  @IsOptional()
  @IsIn(['de', 'en', 'fr', 'es', 'pt', 'it'])
  language?: 'de' | 'en' | 'fr' | 'es' | 'pt' | 'it';
}
