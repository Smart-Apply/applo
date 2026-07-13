import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionTier } from '../generated/prisma/client';
import { AdminGuard } from './admin.guard';
import { InviteCodeService } from '../invite-codes/invite-code.service';
import { AuditLoggerService } from '../common/audit-logger';
import { Sanitize } from '../common/decorators/sanitize.decorator';

class SetTierDto {
  @IsIn(['FREE', 'PREMIUM', 'PREMIUM_PLUS'])
  tier!: SubscriptionTier;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  periodMonths?: number;
}

/**
 * Body of `POST /admin/invite-codes`. Note: `note` is sanitized because it
 * will be rendered in the admin UI listing endpoint.
 */
class IssueInviteCodesDto {
  @IsInt()
  @Min(1)
  @Max(100)
  count!: number;

  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(200)
  note?: string;

  /** ISO-8601 expiry (e.g. `2026-12-31T23:59:59.000Z`). Optional. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

/**
 * Admin endpoints — gated by `ADMIN_EMAILS` env var (case-insensitive
 * allow-list). When `ADMIN_EMAILS` is empty, every route here returns 403.
 *
 * These endpoints are intentionally narrow: they exist to replace one-off
 * scripts that previously had to be `flyctl ssh`'d into the running
 * container. Nothing here is exposed to regular users.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly inviteCodes: InviteCodeService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Look up users by partial email match (case-insensitive). Useful before
   * calling the tier-change endpoint to confirm casing.
   */
  @Get('users')
  @ApiOperation({ summary: 'Search users by partial email (admin only)' })
  async findUsers(@Query('email') email?: string) {
    if (!email || email.length < 2) {
      throw new BadRequestException('Provide ?email=<at-least-2-chars>');
    }
    const users = await this.prisma.user.findMany({
      where: { email: { contains: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        subscription: { select: { tier: true, status: true, currentPeriodEnd: true } },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    return { count: users.length, users };
  }

  /**
   * Change a user's subscription tier and reset the billing period.
   *
   * Idempotent. The :email path param is matched case-insensitively. Returns
   * the updated subscription including the (possibly newly-created) usage
   * row.
   *
   * Example:
   *   POST /api/v1/admin/users/foo@example.com/tier
   *   Body: { "tier": "PREMIUM" }
   *   Body: { "tier": "PREMIUM", "periodMonths": 6 }
   */
  @Post('users/:email/tier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set a user's subscription tier (admin only)" })
  async setUserTier(
    @Param('email') email: string,
    @Body() body: SetTierDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${email}`);
    }

    const updated = await this.subscriptions.setUserTier(user.id, body.tier, {
      periodMonths: body.periodMonths,
    });

    this.logger.log(
      `Admin ${actorEmail} set tier=${body.tier} for ${user.email} (id=${user.id})`,
    );

    return {
      user: { id: user.id, email: user.email },
      subscription: {
        tier: updated.tier,
        status: updated.status,
        currentPeriodStart: updated.currentPeriodStart,
        currentPeriodEnd: updated.currentPeriodEnd,
      },
    };
  }

  /**
   * Permanently delete a user account by email (admin override \u2014 no
   * password confirmation required).
   *
   * Use case: an OAuth-only user (e.g. "Sign in with Google") asks support
   * to delete their account but cannot complete the self-service flow
   * because they never set a password. Once the frontend OAuth-aware
   * delete dialog ships, this endpoint stays as the support escape hatch.
   *
   * Cascade: Prisma `onDelete: Cascade` cleans up Profile, Applications,
   * JobPostings, Sessions, RefreshTokens, UserPreferences, OAuthProviders,
   * MailboxConnections, etc. Stored PDF files in R2/disk are NOT deleted
   * here \u2014 same trade-off as `AuthService.deleteAccount`. A separate
   * cleanup job handles orphaned blobs.
   *
   * Idempotent-ish: returns 404 if the user is already gone.
   *
   * Example:
   *   DELETE /api/v1/admin/users/foo@example.com
   */
  @Delete('users/:email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a user account by email (admin only)' })
  async deleteUser(
    @Param('email') email: string,
    @CurrentUser('email') actorEmail: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, provider: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${email}`);
    }

    await this.prisma.user.delete({ where: { id: user.id } });

    this.logger.warn(
      `Admin ${actorEmail} permanently deleted user ${user.email} (id=${user.id}, provider=${user.provider ?? 'local'})`,
    );

    return {
      deleted: true,
      user: { id: user.id, email: user.email, provider: user.provider },
    };
  }

  // ---------------------------------------------------------------------
  // Closed-beta invite codes (item #A3 in CLOSED_BETA_PLAN.md)
  // ---------------------------------------------------------------------

  /**
   * Issue N invite codes in a single batch. Returns the plaintext codes
   * EXACTLY ONCE — they cannot be retrieved again because only the
   * sha256 hash is persisted. Save them somewhere durable (1Password,
   * email drafts, Notion) before closing the response.
   *
   * Example:
   *   POST /api/v1/admin/invite-codes
   *   { "count": 25, "note": "Wave 1 — Reddit r/sideproject" }
   *
   * Optional ISO-8601 expiry:
   *   { "count": 5, "note": "Wave 2 — conference handout", "expiresAt": "2027-01-01T00:00:00Z" }
   */
  @Post('invite-codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Issue closed-beta invite codes (admin only — plaintexts returned ONCE)',
  })
  async issueInviteCodes(
    @Body() body: IssueInviteCodesDto,
    @CurrentUser('id') adminUserId: string,
    @CurrentUser('email') adminEmail: string,
    @Req() req: Request,
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    const issued = await this.inviteCodes.issue(body.count, body.note, expiresAt);

    this.auditLogger.logInviteCodesIssued(adminUserId, adminEmail, req, {
      count: issued.length,
      prefixes: issued.map((c) => c.prefix),
      note: body.note,
    });

    this.logger.log(
      `Admin ${adminEmail} issued ${issued.length} invite code(s)${body.note ? ` (note: ${body.note})` : ''}`,
    );

    return {
      message:
        'Codes returned ONCE — save them now. The plaintexts are not stored and cannot be retrieved later.',
      count: issued.length,
      codes: issued,
    };
  }

  /**
   * List invite codes for admin review. Never returns plaintexts — only
   * metadata (prefix, note, usage status). `?available=true` filters to
   * unused codes only.
   */
  @Get('invite-codes')
  @ApiOperation({ summary: 'List invite codes (admin only — metadata only)' })
  async listInviteCodes(@Query('available') available?: string) {
    const onlyUnused = available === 'true';
    const codes = await this.inviteCodes.list(!onlyUnused);
    return {
      count: codes.length,
      filter: onlyUnused ? 'available' : 'all',
      codes,
    };
  }
}
