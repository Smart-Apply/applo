import { OrphanedUploadCron } from './orphaned-upload.cron';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '../../config/config.service';
import type { StorageService } from '../../storage/storage.service';

const base64 = (key: string) => Buffer.from(key).toString('base64');
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * `POST /uploads` writes a raw résumé/job-posting file and nothing recorded
 * that key until it became a JobPosting — so an abandoned upload stayed in
 * object storage forever (Art. 5(1)(e) DSGVO). The sweep must delete only
 * unreferenced, aged-out objects in the user namespace.
 */
describe('OrphanedUploadCron (Unit)', () => {
  const build = (options?: {
    enableCronJobs?: boolean;
    uploadRetentionDays?: number;
    objects?: { key: string; size: number; lastModified: Date | null }[];
    referencedFileIds?: string[];
  }) => {
    const prisma = {
      jobPosting: {
        findMany: vi
          .fn()
          .mockResolvedValue((options?.referencedFileIds ?? []).map((fileId) => ({ fileId }))),
      },
    } as unknown as PrismaService;

    const config = {
      enableCronJobs: options?.enableCronJobs ?? true,
      uploadRetentionDays: options?.uploadRetentionDays ?? 7,
    } as unknown as ConfigService;

    const storage = {
      list: vi.fn().mockResolvedValue(options?.objects ?? []),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageService;

    return { cron: new OrphanedUploadCron(prisma, config, storage), storage, prisma };
  };

  const deletedKeys = (storage: StorageService) =>
    (storage.delete as ReturnType<typeof vi.fn>).mock.calls.map(([key]) => key);

  it('deletes aged-out uploads that no job posting references', async () => {
    const { cron, storage } = build({
      objects: [
        { key: 'user-1/1700000000000-abandoned.pdf', size: 10, lastModified: daysAgo(30) },
        { key: 'user-1/1700000000001-linked.pdf', size: 10, lastModified: daysAgo(30) },
      ],
      referencedFileIds: [base64('user-1/1700000000001-linked.pdf')],
    });

    await cron.sweepOrphanedUploads();

    expect(deletedKeys(storage)).toEqual(['user-1/1700000000000-abandoned.pdf']);
  });

  it('never touches the application, profile and template namespaces', async () => {
    const { cron, storage } = build({
      objects: [
        { key: 'applications/app-1/resume.pdf', size: 10, lastModified: daysAgo(400) },
        { key: 'profiles/profile-1/photo.jpg', size: 10, lastModified: daysAgo(400) },
        { key: 'templates/classic-ats/preview.png', size: 10, lastModified: daysAgo(400) },
      ],
    });

    await cron.sweepOrphanedUploads();

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('keeps uploads inside the grace window and objects without a timestamp', async () => {
    const { cron, storage } = build({
      objects: [
        { key: 'user-1/fresh.pdf', size: 10, lastModified: daysAgo(1) },
        { key: 'user-1/unknown-age.pdf', size: 10, lastModified: null },
      ],
    });

    await cron.sweepOrphanedUploads();

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('does nothing when the sweep or the cron scheduler is disabled', async () => {
    const objects = [{ key: 'user-1/old.pdf', size: 10, lastModified: daysAgo(90) }];

    const disabledSweep = build({ objects, uploadRetentionDays: 0 });
    await disabledSweep.cron.sweepOrphanedUploads();
    expect(disabledSweep.storage.list).not.toHaveBeenCalled();

    const disabledCron = build({ objects, enableCronJobs: false });
    await disabledCron.cron.sweepOrphanedUploads();
    expect(disabledCron.storage.list).not.toHaveBeenCalled();
  });

  it('keeps sweeping when a single delete fails', async () => {
    const { cron, storage } = build({
      objects: [
        { key: 'user-1/a.pdf', size: 10, lastModified: daysAgo(30) },
        { key: 'user-1/b.pdf', size: 10, lastModified: daysAgo(30) },
      ],
    });
    (storage.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('storage offline'));

    await cron.sweepOrphanedUploads();

    expect(storage.delete).toHaveBeenCalledTimes(2);
  });
});
