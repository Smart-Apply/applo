import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { createDocumentUploadPipe } from '../common/pipes/file-validation.pipe';
import { UploadsService } from './uploads.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (PDF or DOCX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (PDF or DOCX, max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file type, size exceeds 10MB limit, or no file provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async uploadFile(
    @UploadedFile(
      // MAX_FILE_SIZE_MB is read from process.env (not ConfigService) because
      // decorator arguments evaluate at class-definition time, before the DI
      // container exists. NOTE: this means the override only takes effect as a
      // REAL process env var at boot (e.g. Fly secrets, `MAX_FILE_SIZE_MB=5
      // pnpm start:dev`) — a value set solely in apps/api/.env loads too late.
      createDocumentUploadPipe(parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)),
    )
    file: Express.Multer.File,
    @Request() req,
  ): Promise<UploadResponseDto> {
    return this.uploadsService.uploadFile(req.user.userId, file);
  }
}
