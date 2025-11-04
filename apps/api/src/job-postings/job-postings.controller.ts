import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JobPostingsService } from './job-postings.service';
import { ParseJobPostingDto, JobPostingResponseDto } from './dto';

@ApiTags('job-postings')
@Controller('job-postings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobPostingsController {
  constructor(private readonly jobPostingsService: JobPostingsService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse job posting from text, URL, or file' })
  @ApiResponse({
    status: 201,
    description: 'Job posting parsed and created successfully',
    type: JobPostingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or parsing failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async parseJobPosting(@Body() dto: ParseJobPostingDto): Promise<JobPostingResponseDto> {
    return this.jobPostingsService.parseJobPosting(dto);
  }
}
