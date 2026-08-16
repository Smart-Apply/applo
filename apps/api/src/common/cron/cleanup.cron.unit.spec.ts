import { CleanupCron } from './cleanup.cron';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '../../config/config.service';
import type { ApplicationsService } from '../../applications/applications.service';
import type { JobPostingsService } from '../../job-postings/job-postings.service';

/**
 * The sweep used to be a bare `deleteMany`, which removed the row and left the
 * generated PDFs (full résumés) in object storage indefinitely — Art. 17 /
 * Art. 5(1)(e) DSGVO. Deletion has to run through the services that own the
 * storage cleanup, so these tests assert the delegation, not the SQL.
 */
describe('CleanupCron (Unit)', () => {
  const build = (options?: { enableCronJobs?: boolean }) => {
    const prisma = {
      application: { findMany: vi.fn().mockResolvedValue([]) },
      jobPosting: { findMany: vi.fn().mockResolvedValue([]) },
      refreshMaterializedViews: vi.fn(),
    } as unknown as PrismaService;

    const config = {
      enableCronJobs: options?.enableCronJobs ?? true,
    } as unknown as ConfigService;

    const applications = { hardDelete: vi.fn().mockResolvedValue(undefined) };
    const jobPostings = { hardDeleteJobPosting: vi.fn().mockResolvedValue(undefined) };

    return {
      cron: new CleanupCron(
        prisma,
        config,
        applications as unknown as ApplicationsService,
        jobPostings as unknown as JobPostingsService,
      ),
      prisma,
      applications,
      jobPostings,
    };
  };

  it('hard-deletes each expired application through the storage-aware service', async () => {
    const { cron, prisma, applications } = build();
    (prisma.application.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'app-1', userId: 'user-1' },
      { id: 'app-2', userId: 'user-2' },
    ]);

    await cron.cleanupDeletedApplications();

    expect(applications.hardDelete).toHaveBeenCalledTimes(2);
    expect(applications.hardDelete).toHaveBeenCalledWith('user-1', 'app-1');
    expect(applications.hardDelete).toHaveBeenCalledWith('user-2', 'app-2');
  });

  it('keeps sweeping when a single application fails to delete', async () => {
    const { cron, prisma, applications } = build();
    (prisma.application.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'app-1', userId: 'user-1' },
      { id: 'app-2', userId: 'user-2' },
    ]);
    applications.hardDelete.mockRejectedValueOnce(new Error('storage offline'));

    await cron.cleanupDeletedApplications();

    expect(applications.hardDelete).toHaveBeenCalledTimes(2);
  });

  it('hard-deletes each expired job posting through the storage-aware service', async () => {
    const { cron, prisma, jobPostings } = build();
    (prisma.jobPosting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'job-1', userId: 'user-1' },
    ]);

    await cron.cleanupDeletedJobPostings();

    expect(jobPostings.hardDeleteJobPosting).toHaveBeenCalledWith('user-1', 'job-1');
  });

  it('does nothing when cron jobs are disabled', async () => {
    const { cron, prisma, applications, jobPostings } = build({ enableCronJobs: false });

    await cron.cleanupDeletedApplications();
    await cron.cleanupDeletedJobPostings();

    expect(prisma.application.findMany).not.toHaveBeenCalled();
    expect(applications.hardDelete).not.toHaveBeenCalled();
    expect(jobPostings.hardDeleteJobPosting).not.toHaveBeenCalled();
  });
});
