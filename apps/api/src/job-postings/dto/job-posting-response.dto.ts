import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobPostingResponseDto {
  @ApiProperty({ description: 'Job posting ID' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  title: string;

  @ApiProperty({ description: 'Company name' })
  company: string;

  @ApiPropertyOptional({ description: 'Job location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Detected language (ISO 639-1 code)' })
  language?: string;

  @ApiProperty({ description: 'Full job posting text (description, requirements, responsibilities, benefits, etc.)' })
  fullText: string;

  @ApiPropertyOptional({ description: 'Raw HTML/scraped content for debugging' })
  rawText?: string;

  @ApiPropertyOptional({ description: 'Source URL if provided' })
  sourceUrl?: string;

  @ApiPropertyOptional({ description: 'File ID if provided' })
  fileId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
