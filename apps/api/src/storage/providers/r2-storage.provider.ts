import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from '../storage.interface';
import { ConfigService } from '../../config/config.service';

/**
 * Cloudflare R2 storage provider.
 *
 * R2 is S3-compatible, so we reuse the AWS SDK. The endpoint must point at
 * `https://<account-id>.r2.cloudflarestorage.com` and the region must be
 * `auto`. Region is required by the SDK but ignored by R2.
 *
 * SAS-equivalent download URLs are generated with `getSignedUrl()` from
 * `@aws-sdk/s3-request-presigner`. R2 honours the presigned URL the same
 * way S3 does, but max expiry is 7 days (we cap to 1h here, matching
 * the existing Azure Blob behaviour).
 *
 * IMPORTANT: R2 buckets are private by default. Public read access requires
 * either a bucket-level public URL or a presigned URL per object — we use
 * presigned URLs to keep parity with the existing SAS-based flow.
 */
@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.r2AccountId;
    const accessKeyId = this.configService.r2AccessKeyId;
    const secretAccessKey = this.configService.r2SecretAccessKey;
    const endpoint =
      this.configService.r2Endpoint ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
    this.bucket = this.configService.r2Bucket;

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      throw new Error(
        'R2 storage requires R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and either R2_ENDPOINT or R2_ACCOUNT_ID',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Path-style addressing is required for R2 to avoid certificate
      // issues with subdomain bucket names.
      forcePathStyle: true,
    });

    this.logger.log(`Cloudflare R2 storage initialized: bucket=${this.bucket}`);
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      this.logger.log(`File uploaded to R2: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload to R2 ${key}: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`Empty body returned from R2 for key ${key}`);
      }

      // The SDK returns a streaming Body in Node — convert to Buffer.
      const buffer = await this.streamToBuffer(response.Body as NodeJS.ReadableStream);
      this.logger.log(`File downloaded from R2: ${key}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to download from R2 ${key}: ${error.message}`);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`File deleted from R2: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete from R2 ${key}: ${error.message}`);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    try {
      // R2 caps presigned URL expiry at 7 days (604800 seconds). Most callers
      // pass 3600 (1h), but clamp defensively.
      const expiresIn = Math.min(Math.max(expiresInSeconds, 1), 604800);

      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn },
      );

      this.logger.log(`Generated R2 presigned URL for ${key} (expires in ${expiresIn}s)`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to presign R2 URL for ${key}: ${error.message}`);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      this.logger.error(`R2 health check failed: ${error.message}`);
      return false;
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
