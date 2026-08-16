import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { UserErasureModule } from '../common/erasure/user-erasure.module';

/**
 * AdminModule
 *
 * Admin-only endpoints (allow-listed via `ADMIN_EMAILS`). PrismaService and
 * SubscriptionService are already global, so we only need to declare the
 * controller + guard here. UserErasureModule provides the shared Art. 17
 * erasure path (storage prefixes + pseudonymous usage trail + user row).
 */
@Module({
  imports: [UserErasureModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
