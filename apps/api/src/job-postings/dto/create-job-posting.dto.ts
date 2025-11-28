import { IsString, IsOptional, IsUrl, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateJobPostingDto {
  @ApiProperty({ description: 'Job title', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @Sanitize()
  title: string;

  @ApiProperty({ description: 'Company name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @Sanitize()
  company: string;

  @ApiPropertyOptional({ description: 'Job location', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Sanitize()
  location?: string;

  @ApiPropertyOptional({ description: 'Detected language (ISO 639-1 code: de, en, fr, es, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ description: 'Job posting URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ description: 'Full job posting text (description, requirements, responsibilities, benefits, etc.)' })
  @IsString()
  @Sanitize()
  fullText: string;

  @ApiPropertyOptional({ description: 'Salary range', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Sanitize()
  salary?: string;

  @ApiPropertyOptional({
    description: 'Employment type (e.g., Full-time, Part-time, Contract)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Sanitize()
  employmentType?: string;
}
