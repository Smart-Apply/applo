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
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
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
import { ValidationService } from './validation.service';
import { CreateValidationDto } from './dto/create-validation.dto';
import type { Validation, ValidationSummary } from '@applo/shared';

@ApiTags('validation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

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
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
            message: 'Die Datei ist zu groß. Bitte lade eine Datei mit maximal 10 MB hoch.',
          }),
          new FileTypeValidator({
            fileType: /(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
          }),
        ],
        fileIsRequired: true,
        errorHttpStatusCode: 400,
      }),
    )
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
      '5 checks/month, Pro and above are unlimited. The result is persisted so it can be revisited.',
  })
  @ApiResponse({ status: 201, description: 'Validation completed and stored' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Monthly validation limit reached (free tier)' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateValidationDto,
  ): Promise<Validation> {
    return this.validationService.create(userId, dto);
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
