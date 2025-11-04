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

  @ApiPropertyOptional({ description: 'Full job description' })
  description?: string;

  @ApiProperty({ description: 'Job requirements', type: [String] })
  requirements: string[];

  @ApiProperty({ description: 'Job responsibilities', type: [String] })
  responsibilities: string[];

  @ApiProperty({ description: 'Nice to have qualifications', type: [String] })
  niceToHave: string[];

  @ApiPropertyOptional({ description: 'Raw text content' })
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
