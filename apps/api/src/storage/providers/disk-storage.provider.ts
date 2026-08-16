import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import type { Dirent, Stats } from 'fs';
import * as path from 'path';
import { StorageObject, StorageProvider } from '../storage.interface';

@Injectable()
export class DiskStorageProvider implements StorageProvider {
  private readonly logger = new Logger(DiskStorageProvider.name);
  private readonly uploadDir: string;

  constructor() {
    // Store files in uploads directory at project root
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory ready: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error.message}`);
      throw error;
    }
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const fileDir = path.dirname(filePath);

    try {
      // Ensure subdirectories exist
      await fs.mkdir(fileDir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, buffer);

      this.logger.log(`File uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, key);

    try {
      const buffer = await fs.readFile(filePath);
      this.logger.log(`File downloaded successfully: ${key}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to download file ${key}: ${error.message}`);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);

    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}: ${error.message}`);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Recursive directory walk under `<uploadDir>/<prefix>`. The prefix is
   * resolved and re-checked against the upload root so a traversal-shaped
   * prefix ("../") can never escape the storage directory.
   */
  async list(prefix: string): Promise<StorageObject[]> {
    const root = this.resolveWithinUploadDir(prefix);
    const results: StorageObject[] = [];

    const walk = async (absolute: string, relative: string): Promise<void> => {
      const entries = await this.readDirOrEmpty(absolute);

      for (const entry of entries) {
        const childAbsolute = path.join(absolute, entry.name);
        const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walk(childAbsolute, childRelative);
          continue;
        }
        if (!entry.isFile()) continue;
        const stat = await fs.stat(childAbsolute);
        results.push({ key: childRelative, size: stat.size, lastModified: stat.mtime });
      }
    };

    // A prefix may point at a directory ("<userId>/") or be a partial file
    // name. `fs.stat` tells us which, and a missing path yields no objects.
    let stat: Stats;
    try {
      stat = await fs.stat(root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }

    if (stat.isDirectory()) {
      await walk(root, normalizePrefix(prefix));
      return results;
    }

    return [{ key: prefix, size: stat.size, lastModified: stat.mtime }];
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const objects = await this.list(prefix);
    for (const object of objects) {
      await fs.rm(this.resolveWithinUploadDir(object.key), { force: true });
    }

    // Remove the now-empty directory tree so a later `list()` doesn't have to
    // walk the husk of a deleted account.
    const root = this.resolveWithinUploadDir(prefix);
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);

    this.logger.log(`Deleted ${objects.length} object(s) under prefix ${prefix}`);
    return objects.length;
  }

  /**
   * ENOENT simply means "no objects under this prefix" — the R2 provider
   * returns an empty list for that, so match the behaviour.
   */
  private async readDirOrEmpty(absolute: string): Promise<Dirent[]> {
    try {
      return await fs.readdir(absolute, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Join a caller-supplied key/prefix onto the upload root and verify the
   * result stays inside it. Callers are trusted today, but erasure paths pass
   * database-sourced values and a single traversal would turn a delete into
   * arbitrary file removal.
   */
  private resolveWithinUploadDir(key: string): string {
    const resolved = path.resolve(this.uploadDir, key);
    const root = path.resolve(this.uploadDir);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error(`Refusing to access storage path outside the upload directory: ${key}`);
    }
    return resolved;
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    // For disk storage, return a simple file path
    // In a real app, you might want to generate a temporary token
    const filePath = path.join(this.uploadDir, key);

    try {
      // Check if file exists
      await fs.access(filePath);
      return `file://${filePath}`;
    } catch (error) {
      this.logger.error(`File not found for signed URL: ${key}`);
      throw new Error(`File not found: ${key}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.uploadDir);
      return true;
    } catch (error) {
      this.logger.error('Disk storage health check failed');
      return false;
    }
  }
}

/** Strip a trailing slash so keys join as `<prefix>/<name>` exactly once. */
function normalizePrefix(prefix: string): string {
  return prefix.replace(/\/+$/, '');
}
