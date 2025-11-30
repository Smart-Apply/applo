import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportApplicationDto {
  @ApiPropertyOptional({
    description: 'Language for PDF generation (ISO 639-1 code)',
    example: 'de',
    enum: ['de', 'en', 'fr', 'es', 'it'],
  })
  @IsOptional()
  @IsIn(['de', 'en', 'fr', 'es', 'it'])
  language?: 'de' | 'en' | 'fr' | 'es' | 'it';
}
