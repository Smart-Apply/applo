import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { LlmUsageService } from '../../llm/usage/llm-usage.service';

export interface UserErasureResult {
  applicationsDeleted: number;
  storagePrefixesPurged: number;
  llmUsageEventsDeleted: number;
}

/**
 * Single implementation of "erase everything we hold for this user"
 * (Art. 17 DSGVO).
 *
 * Both deletion paths — the self-service `AuthService.deleteAccount` and the
 * support-driven `DELETE /admin/users/:email` — call this. A second, hand-kept
 * copy of an erasure routine is how the account-deletion path ended up
 * removing only generated PDFs while every uploaded original survived: the
 * caller has to remember the list, and eventually one caller doesn't.
 */
@Injectable()
export class UserErasureService {
  private readonly logger = new Logger(UserErasureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly llmUsageService: LlmUsageService,
  ) {}

  /**
   * Delete the user row (cascading to every owned relation) plus the two
   * stores the cascade cannot reach: object storage and the pseudonymous
   * `llm_usage_events` trail.
   */
  async eraseUser(userId: string): Promise<UserErasureResult> {
    const { prefixes, applicationCount } = await this.collectStoragePrefixes(userId);

    // Runs BEFORE the delete and is allowed to throw: `llm_usage_events` has
    // no User FK, so once the row is gone the only key back to those events
    // (the salted actorHash of the user id) is gone with it.
    const llmUsageEventsDeleted = await this.llmUsageService.deleteEventsForActor(userId);

    await this.prisma.user.delete({ where: { id: userId } });

    // Best-effort: the account is already gone, and an orphaned object must
    // not turn into an undeletable user row. Failures are logged loudly so a
    // storage outage during erasure is visible in the operational log.
    await Promise.all(prefixes.map((prefix) => this.storageService.tryDeleteByPrefix(prefix)));

    this.logger.log(
      `Erased user ${userId}: purged ${prefixes.length} storage prefix(es), ${llmUsageEventsDeleted} usage event(s)`,
    );

    return {
      applicationsDeleted: applicationCount,
      storagePrefixesPurged: prefixes.length,
      llmUsageEventsDeleted,
    };
  }

  /**
   * Every storage namespace that can hold objects for this user. Prefixes, not
   * stored keys: a key the database forgot (or never persisted, like the raw
   * uploads under `<userId>/`) is data we would otherwise keep forever
   * (Art. 5(1)(e) DSGVO).
   */
  private async collectStoragePrefixes(
    userId: string,
  ): Promise<{ prefixes: string[]; applicationCount: number }> {
    const [applications, profile] = await Promise.all([
      this.prisma.application.findMany({ where: { userId }, select: { id: true } }),
      this.prisma.profile.findUnique({ where: { userId }, select: { id: true } }),
    ]);

    return {
      prefixes: [
        // Raw uploads — see `UploadsService.generateStorageKey`.
        `${userId}/`,
        // Generated cover letter + résumé PDFs.
        ...applications.map((application) => `applications/${application.id}/`),
        // Bewerbungsfoto.
        ...(profile ? [`profiles/${profile.id}/`] : []),
      ],
      applicationCount: applications.length,
    };
  }
}
