import { Injectable, Inject, Logger } from '@nestjs/common';
import { StorageObject, StorageProvider } from './storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly provider: StorageProvider,
  ) {}

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    this.logger.log(`Uploading file: ${key}`);
    return this.provider.upload(key, buffer, mimeType);
  }

  async download(key: string): Promise<Buffer> {
    this.logger.log(`Downloading file: ${key}`);
    return this.provider.download(key);
  }

  async getFile(key: string): Promise<Buffer> {
    this.logger.log(`Getting file: ${key}`);
    return this.provider.download(key);
  }

  async delete(key: string): Promise<void> {
    this.logger.log(`Deleting file: ${key}`);
    return this.provider.delete(key);
  }

  async list(prefix: string): Promise<StorageObject[]> {
    return this.provider.list(prefix);
  }

  /**
   * Erase every object under a key prefix. Prefer this over per-key deletes on
   * GDPR erasure paths: a key the database forgot about is data we would keep
   * forever (Art. 17 / Art. 5(1)(e) DSGVO).
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    this.logger.log(`Deleting all files under prefix: ${prefix}`);
    return this.provider.deleteByPrefix(prefix);
  }

  /**
   * Best-effort variant of {@link deleteByPrefix} for paths where the database
   * row is already gone and a storage failure must not surface to the caller.
   * Returns the number of deleted objects, or `null` when the sweep failed.
   */
  async tryDeleteByPrefix(prefix: string): Promise<number | null> {
    try {
      return await this.deleteByPrefix(prefix);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete storage prefix ${prefix}: ${message}`);
      return null;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    this.logger.log(`Generating signed URL for: ${key}`);
    return this.provider.getSignedUrl(key, expiresInSeconds);
  }

  async healthCheck(): Promise<boolean> {
    return this.provider.healthCheck();
  }
}
