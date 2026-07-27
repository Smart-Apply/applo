import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly storageService: StorageService) {}

  async uploadFile(userId: string, file: Express.Multer.File): Promise<UploadResponseDto> {
    // Size + MIME (with magic-byte sniffing) are enforced at the boundary by
    // the shared document pipe (common/pipes/file-validation.pipe.ts) — the
    // service no longer re-checks what the controller already rejected.
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate and sanitize filename
    const sanitizedFilename = this.sanitizeFilename(file.originalname);

    // Generate unique storage key
    const storageKey = this.generateStorageKey(userId, sanitizedFilename);

    try {
      // Upload to storage
      await this.storageService.upload(storageKey, file.buffer, file.mimetype);

      this.logger.log(`File uploaded successfully: ${storageKey}`);

      // Return response DTO
      const response: UploadResponseDto = {
        id: this.generateUploadId(storageKey),
        fileName: sanitizedFilename,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        uploadedAt: new Date(),
      };

      return response;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts and dangerous characters
    const sanitized = filename
      .replace(/\.\./g, '') // Remove path traversal
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
      .slice(0, 255); // Limit length

    if (!sanitized) {
      throw new BadRequestException('Invalid filename');
    }

    return sanitized;
  }

  private generateStorageKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    return `${userId}/${timestamp}-${filename}`;
  }

  private generateUploadId(storageKey: string): string {
    // For simplicity, use base64 encoded storage key as ID
    // In production, you might want to store this in DB and return DB ID
    return Buffer.from(storageKey).toString('base64');
  }
}
