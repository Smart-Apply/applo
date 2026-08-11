import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsageLimitGuard } from '../common/guards/usage-limit.guard';
import { EmailVerifiedGuard } from '../common/guards/email-verified.guard';
import { CheckUsage } from '../common/decorators/tier.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { createDocumentUploadPipe } from '../common/pipes/file-validation.pipe';
import { ValidationService } from './validation.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateValidationDto } from './dto/create-validation.dto';
import type { Validation, ValidationSummary } from '@applo/shared';

@ApiTags('validation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('validation')
export class ValidationController {
  constructor(
    private readonly validationService: ValidationService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post('extract-text')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 uploads/min
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Extract plain text from an uploaded PDF/DOCX',
    description:
      'Extracts the raw text from an uploaded résumé or cover letter (PDF or DOCX) so the user can ' +
      'run a Bewerbungs-Check without copy-pasting. No AI, not metered.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF or DOCX file (max 10MB)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Extracted text' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async extractText(
    @UploadedFile(createDocumentUploadPipe())
    file: Express.Multer.File,
  ): Promise<{ text: string }> {
    return this.validationService.extractText(file.buffer, file.mimetype);
  }

  @Post()
  @UseGuards(EmailVerifiedGuard, UsageLimitGuard)
  @CheckUsage('validation')
  @ApiOperation({
    summary: 'Check an externally-created application (AI quality + ATS review)',
    description:
      "Runs an AI quality + ATS review of the user's own résumé (+ optional cover letter and job " +
      'context) created outside Applo, and returns actionable feedback. Metered: Free tier gets ' +
      '3 checks/month, Pro gets 15, and Premium gets 35. The result is persisted so it can be revisited.',
  })
  @ApiResponse({ status: 201, description: 'Validation completed and stored' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Monthly validation limit reached' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateValidationDto,
  ): Promise<Validation> {
    // Re-submitting identical inputs replays the stored result, so no quota is
    // reserved for it. Checked before reserveUsage to keep the reservation
    // atomic with the work it pays for.
    const cached = await this.validationService.findCachedResult(userId, dto);
    if (cached) {
      return cached;
    }

    const reservation = await this.subscriptionService.reserveUsage(userId, 'validation');
    try {
      return await this.validationService.create(userId, dto);
    } catch (error) {
      await this.subscriptionService.releaseUsage(reservation);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'List the current user’s validation checks (history)' })
  @ApiResponse({ status: 200, description: 'Validation history (newest first)' })
  async findAll(@CurrentUser('id') userId: string): Promise<ValidationSummary[]> {
    return this.validationService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single validation check (inputs + result)' })
  @ApiResponse({ status: 200, description: 'Validation record' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<Validation> {
    return this.validationService.findOne(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a validation check' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    return this.validationService.remove(userId, id);
  }
}
