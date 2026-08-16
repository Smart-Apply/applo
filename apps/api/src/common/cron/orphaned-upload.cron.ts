import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { StorageService } from '../../storage/storage.service';

/**
 * Retention sweep for uploaded originals (Art. 5(1)(e) DSGVO).
 *
 * `POST /uploads` writes the raw file — a résumé or a job-posting document,
 * both of which are exactly the kind of dossier the rest of the system treats
 * as sensitive — to `<userId>/<timestamp>-<uuid><ext>` and hands the caller a
 * base64 handle. Nothing records that key in the database until the file is
 * turned into a `JobPosting`, and nothing ever deleted it. An upload the user
 * abandoned (wrong file, closed tab, failed parse) therefore stayed in object
 * storage forever.
 *
 * The sweep is deliberately reference-driven rather than age-driven alone: a
 * key that is still cited by a `JobPosting.fileId` is live data regardless of
 * age, and a key younger than the grace window may be mid-flight between the
 * upload response and the job-posting write.
 *
 * 03:30 keeps clear of the 00:00 / 00:05 cleanup crons and the 04:00 LLM
 * usage retention sweep.
 */
@Injectable()
export class OrphanedUploadCron {
  private readonly logger = new Logger(OrphanedUploadCron.name);

  /**
   * Storage namespaces owned by other lifecycles. Generated PDFs die with
   * their application, previews with their template, the Bewerbungsfoto with
   * the profile — none of them are reachable from `JobPosting.fileId`, so
   * they must never be considered orphaned here.
   */
  private static readonly MANAGED_PREFIXES = ['applications/', 'profiles/', 'templates/'];

  /** Safety cap per run; a backlog drains across runs. */
  private static readonly BATCH_SIZE = 1000;

  /** Chunk size for the `fileId IN (...)` reference lookup. */
  private static readonly LOOKUP_CHUNK = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  @Cron('30 3 * * *') // 03:30 every day
  async sweepOrphanedUploads(): Promise<void> {
    if (!this.configService.enableCronJobs) {
      this.logger.debug('Orphaned upload sweep skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    const retentionDays = this.configService.uploadRetentionDays;
    if (retentionDays <= 0) {
      this.logger.warn(
        'Orphaned upload sweep disabled (UPLOAD_RETENTION_DAYS=0) — abandoned uploads are kept indefinitely',
      );
      return;
    }

    const startTime = Date.now();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    try {
      const candidates = (await this.storageService.list(''))
        .filter((object) => !OrphanedUploadCron.isManaged(object.key))
        // An object without a timestamp cannot be aged out safely — keeping
        // it costs storage, deleting it could destroy a fresh upload.
        .filter((object) => object.lastModified !== null && object.lastModified < cutoff)
        .slice(0, OrphanedUploadCron.BATCH_SIZE);

      if (candidates.length === 0) {
        this.logger.debug('Orphaned upload sweep found no candidates');
        return;
      }

      const referenced = await this.findReferencedKeys(candidates.map((object) => object.key));

      let deleted = 0;
      let failed = 0;
      for (const object of candidates) {
        if (referenced.has(object.key)) continue;
        try {
          await this.storageService.delete(object.key);
          deleted++;
        } catch (error) {
          failed++;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to delete orphaned upload ${object.key}: ${message}`);
        }
      }

      if (deleted > 0 || failed > 0) {
        this.logger.log(
          `Orphaned upload sweep deleted ${deleted} file(s) (${failed} failed) older than ${retentionDays} days in ${Date.now() - startTime}ms`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Orphaned upload sweep failed: ${message}`);
    }
  }

  /**
   * `JobPosting.fileId` stores the base64 of the storage key (see
   * `UploadsService.generateUploadId`), so the lookup happens in that space
   * and the result is mapped back to plain keys.
   */
  private async findReferencedKeys(keys: string[]): Promise<Set<string>> {
    const referenced = new Set<string>();
    const encoded = new Map(keys.map((key) => [Buffer.from(key).toString('base64'), key]));
    const fileIds = [...encoded.keys()];

    for (let i = 0; i < fileIds.length; i += OrphanedUploadCron.LOOKUP_CHUNK) {
      const chunk = fileIds.slice(i, i + OrphanedUploadCron.LOOKUP_CHUNK);
      const rows = await this.prisma.jobPosting.findMany({
        where: { fileId: { in: chunk } },
        select: { fileId: true },
      });
      for (const row of rows) {
        const key = row.fileId ? encoded.get(row.fileId) : undefined;
        if (key) referenced.add(key);
      }
    }

    return referenced;
  }

  private static isManaged(key: string): boolean {
    return OrphanedUploadCron.MANAGED_PREFIXES.some((prefix) => key.startsWith(prefix));
  }
}
