import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportApplicationDto {
  @ApiPropertyOptional({
    description:
      'Language for PDF generation (ISO 639-1 code). Content generated in another language ' +
      'is translated automatically on export. Only de/en are supported — fr/es/it were ' +
      'removed because the generation prompts never fully supported them.',
    example: 'de',
    enum: ['de', 'en'],
  })
  @IsOptional()
  @IsIn(['de', 'en'])
  language?: 'de' | 'en';
}
