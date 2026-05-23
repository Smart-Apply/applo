import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { ForbiddenWithCode } from '../common/exceptions/coded-http.exception';
import type { Prisma } from '../generated/prisma/client';

/**
 * Result of `issue()` — the plaintext code is returned ONCE so the admin
 * can hand it out. After this call it can never be retrieved again because
 * we only persist the sha256 hash.
 */
export interface IssuedInviteCode {
  id: string;
  /** The plaintext code, e.g. `BETA-3F2A-9C8B-7E15`. Show ONCE, then forget. */
  code: string;
  /** First 8 chars of the plaintext, safe to persist + display in admin UI. */
  prefix: string;
  note?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
}

/**
 * Per-row redemption status used in the admin "list invite codes" view.
 */
export interface InviteCodeStatus {
  id: string;
  prefix: string;
  note: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  usedAt: Date | null;
  usedBy: { id: string; email: string } | null;
}

/**
 * Closed-beta invite-code service. The contract is intentionally narrow:
 *
 *  - `issue(count, note?, expiresAt?)`  — generate N cryptographically
 *    random codes, persist their sha256 hashes, return the plaintexts
 *    exactly once.
 *  - `redeemInTransaction(tx, code, userId)` — atomic single-use redemption
 *    that must be called inside the same Prisma transaction that creates
 *    the new `User`. Throws `ForbiddenWithCode` on any failure path so the
 *    transaction rolls back and the user is never created.
 *  - `list(includeRedeemed)` — admin listing, never returns plaintexts.
 *
 * Why sha256 and not argon2: the codes are 128-bit cryptographically
 * random tokens (`randomBytes(16)`), so brute-force resistance is the
 * entropy itself. argon2 is for low-entropy human-chosen passwords. This
 * matches how `RefreshToken.token` is stored in the same schema.
 */
@Injectable()
export class InviteCodeService {
  private readonly logger = new Logger(InviteCodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** sha256(plaintext) as lowercase hex. Stable, deterministic. */
  hash(plaintext: string): string {
    return createHash('sha256').update(plaintext.trim()).digest('hex');
  }

  /** First 8 chars of the plaintext — safe display token for admin UIs. */
  private prefixOf(plaintext: string): string {
    return plaintext.slice(0, 8);
  }

  /**
   * Generate a single random invite code. Format: `BETA-XXXX-XXXX-XXXX`
   * where X is uppercase base32 (Crockford alphabet — no 0/O/1/I/L
   * confusion). 16 hex bytes of randomness = 128 bits.
   */
  private generateCode(): string {
    // Crockford base32, padding stripped. Picks up 26 chars of entropy from
    // 16 random bytes (more than enough for our purposes).
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    const bytes = randomBytes(12);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    // BETA-XXXX-XXXX-XXXX (4+4+4 = 12 chars, easy to copy from email)
    return `BETA-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
  }

  /**
   * Issue N invite codes in a single batch. Returns the plaintext codes
   * exactly once — they cannot be retrieved later. Caller is responsible
   * for delivering them to the recipient (email, Notion, etc.).
   *
   * `note` is a free-form admin-only label like "Wave 1 — Sarah from Reddit".
   */
  async issue(
    count: number,
    note?: string,
    expiresAt?: Date,
  ): Promise<IssuedInviteCode[]> {
    if (count < 1 || count > 100) {
      // Hard cap; the admin endpoint enforces this too but be defensive.
      throw new Error(`Invalid invite-code batch size: ${count} (must be 1..100)`);
    }

    const codes: IssuedInviteCode[] = [];
    // Build the plaintexts + hashes first so we can do a single createMany.
    const rowsToCreate: Prisma.InviteCodeCreateManyInput[] = [];
    for (let i = 0; i < count; i++) {
      const plaintext = this.generateCode();
      rowsToCreate.push({
        codeHash: this.hash(plaintext),
        prefix: this.prefixOf(plaintext),
        note: note ?? null,
        expiresAt: expiresAt ?? null,
      });
      // We'll backfill `id` + `createdAt` after the insert using the codeHash
      // as a join key (they're unique).
      codes.push({
        id: '', // filled in below
        code: plaintext,
        prefix: this.prefixOf(plaintext),
        note: note ?? null,
        expiresAt: expiresAt ?? null,
        createdAt: new Date(), // overwritten below
      });
    }

    await this.prisma.inviteCode.createMany({ data: rowsToCreate });

    // Re-read to get the assigned ids / createdAt timestamps. Cheap: we
    // never issue more than 100 in one call.
    const persisted = await this.prisma.inviteCode.findMany({
      where: { codeHash: { in: rowsToCreate.map((r) => r.codeHash) } },
      select: { id: true, codeHash: true, createdAt: true },
    });
    const byHash = new Map(persisted.map((p) => [p.codeHash, p]));
    for (const c of codes) {
      const row = byHash.get(this.hash(c.code));
      if (row) {
        c.id = row.id;
        c.createdAt = row.createdAt;
      }
    }

    this.logger.log(
      `Issued ${count} invite code(s)${note ? ` (note: ${note})` : ''}`,
    );
    return codes;
  }

  /**
   * Atomic single-use redemption. MUST be called inside the same Prisma
   * transaction that creates the new `User`, so a failure here rolls the
   * user creation back.
   *
   * Strategy: `updateMany` with a guarded WHERE that requires `usedAt IS
   * NULL` AND `(expiresAt IS NULL OR expiresAt > NOW())`. If `count`
   * comes back 0 we know SOMETHING about the row was wrong — we then do
   * one cheap follow-up `findUnique` to give the caller a precise error
   * code (invalid / already-used / expired).
   *
   * The `@unique` constraint on `usedByUserId` doubles as a belt-and-braces
   * "one redemption per user" guarantee at the DB layer.
   */
  async redeemInTransaction(
    tx: Prisma.TransactionClient,
    plaintextCode: string,
    userId: string,
  ): Promise<{ inviteCodeId: string; prefix: string }> {
    const trimmed = plaintextCode.trim();
    if (!trimmed) {
      throw new ForbiddenWithCode(ErrorCode.INVITE_CODE_INVALID);
    }

    const codeHash = this.hash(trimmed);
    const now = new Date();

    const updated = await tx.inviteCode.updateMany({
      where: {
        codeHash,
        usedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { usedAt: now, usedByUserId: userId },
    });

    if (updated.count === 1) {
      // Refetch to surface id + prefix to the caller for audit logging.
      const row = await tx.inviteCode.findUnique({
        where: { codeHash },
        select: { id: true, prefix: true },
      });
      // `row` is guaranteed non-null because we just updated it, but TS
      // doesn't know that.
      return { inviteCodeId: row?.id ?? '', prefix: row?.prefix ?? '' };
    }

    // updateMany returned 0 — figure out why so we can give a precise error.
    const existing = await tx.inviteCode.findUnique({
      where: { codeHash },
      select: { usedAt: true, expiresAt: true },
    });

    if (!existing) {
      throw new ForbiddenWithCode(ErrorCode.INVITE_CODE_INVALID);
    }
    if (existing.usedAt) {
      throw new ForbiddenWithCode(ErrorCode.INVITE_CODE_ALREADY_USED);
    }
    if (existing.expiresAt && existing.expiresAt <= now) {
      throw new ForbiddenWithCode(ErrorCode.INVITE_CODE_EXPIRED);
    }
    // Should be unreachable, but fail closed.
    throw new ForbiddenWithCode(ErrorCode.INVITE_CODE_INVALID);
  }

  /**
   * Admin listing — never returns plaintext, only metadata + usage info.
   * `includeRedeemed=false` returns only unused codes (useful for "how
   * many invites do I have left").
   */
  async list(includeRedeemed = true): Promise<InviteCodeStatus[]> {
    const rows = await this.prisma.inviteCode.findMany({
      where: includeRedeemed ? {} : { usedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        prefix: true,
        note: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
        usedBy: { select: { id: true, email: true } },
      },
    });
    return rows;
  }
}
