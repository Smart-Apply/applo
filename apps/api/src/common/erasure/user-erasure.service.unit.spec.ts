import { UserErasureService } from './user-erasure.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../../storage/storage.service';
import type { LlmUsageService } from '../../llm/usage/llm-usage.service';

/**
 * Erasure (Art. 17 DSGVO) has to reach every store that holds objects for the
 * user, not just the keys the database happens to remember. The bug this
 * guards against: the old deletion path collected `coverLetterFileKey` /
 * `resumeFileKey` / `photoKey` and left every uploaded original (résumés,
 * job-posting files under `<userId>/`) in object storage forever.
 */
describe('UserErasureService (Unit)', () => {
  const userId = 'user-1';

  const build = (options?: { profile?: { id: string } | null; applicationIds?: string[] }) => {
    const applicationIds = options?.applicationIds ?? ['app-1', 'app-2'];
    const profile = options?.profile === undefined ? { id: 'profile-1' } : options.profile;

    const prisma = {
      application: { findMany: vi.fn().mockResolvedValue(applicationIds.map((id) => ({ id }))) },
      profile: { findUnique: vi.fn().mockResolvedValue(profile) },
      user: { delete: vi.fn().mockResolvedValue({ id: userId }) },
    } as unknown as PrismaService;

    const storage = {
      tryDeleteByPrefix: vi.fn().mockResolvedValue(1),
    } as unknown as StorageService;

    const llmUsage = {
      deleteEventsForActor: vi.fn().mockResolvedValue(7),
    } as unknown as LlmUsageService;

    return { service: new UserErasureService(prisma, storage, llmUsage), prisma, storage, llmUsage };
  };

  it('purges the raw-upload, application and profile-photo prefixes', async () => {
    const { service, storage } = build();

    const result = await service.eraseUser(userId);

    const purged = (storage.tryDeleteByPrefix as ReturnType<typeof vi.fn>).mock.calls.map(
      ([prefix]) => prefix,
    );
    expect(purged).toEqual(
      expect.arrayContaining([
        `${userId}/`,
        'applications/app-1/',
        'applications/app-2/',
        'profiles/profile-1/',
      ]),
    );
    expect(purged).toHaveLength(4);
    expect(result).toEqual({
      applicationsDeleted: 2,
      storagePrefixesPurged: 4,
      llmUsageEventsDeleted: 7,
    });
  });

  it('skips the photo prefix when the user has no profile', async () => {
    const { service, storage } = build({ profile: null, applicationIds: [] });

    const result = await service.eraseUser(userId);

    expect(storage.tryDeleteByPrefix).toHaveBeenCalledTimes(1);
    expect(storage.tryDeleteByPrefix).toHaveBeenCalledWith(`${userId}/`);
    expect(result.applicationsDeleted).toBe(0);
  });

  it('erases the pseudonymous usage trail before the user row disappears', async () => {
    const order: string[] = [];
    const { service, prisma, llmUsage } = build();
    (llmUsage.deleteEventsForActor as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('llm-usage');
      return 3;
    });
    (prisma.user.delete as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('user-delete');
      return { id: userId };
    });

    await service.eraseUser(userId);

    // `llm_usage_events` has no User FK — once the row is gone, the salted
    // actorHash is the only key back and it can no longer be derived.
    expect(order).toEqual(['llm-usage', 'user-delete']);
  });

  it('does not delete the user when the usage trail cannot be erased', async () => {
    const { service, prisma, llmUsage } = build();
    (llmUsage.deleteEventsForActor as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('db down'),
    );

    await expect(service.eraseUser(userId)).rejects.toThrow('db down');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});
