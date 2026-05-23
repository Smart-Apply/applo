import { Global, Module } from '@nestjs/common';
import { InviteCodeService } from './invite-code.service';

/**
 * InviteCodeModule
 *
 * Exposes `InviteCodeService` for both `AuthModule` (consumed during
 * `POST /auth/register` to redeem a code) and `AdminModule` (consumed by
 * `POST /admin/invite-codes` to issue codes). Marked `@Global()` so those
 * consumers don't have to import this module explicitly — same pattern
 * used for `SubscriptionModule` and `EmailModule`. PrismaService is
 * already global, so no further imports are needed here.
 */
@Global()
@Module({
  providers: [InviteCodeService],
  exports: [InviteCodeService],
})
export class InviteCodeModule {}
