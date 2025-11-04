import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ParseJobPostingDto {
  @ApiPropertyOptional({ description: 'Raw job posting text' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'URL to job posting page' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Storage key of uploaded file (PDF/DOCX)' })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ValidateIf((o) => !o.text && !o.url && !o.fileId)
  @IsString({ message: 'At least one input source (text, url, or fileId) is required' })
  _atLeastOne?: string;
}
