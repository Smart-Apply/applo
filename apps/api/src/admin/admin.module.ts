import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { UserErasureModule } from '../common/erasure/user-erasure.module';
import { AdminLlmUsageController } from './llm-usage/admin-llm-usage.controller';
import { AdminLlmUsageService } from './llm-usage/admin-llm-usage.service';
import { LLMModule } from '../llm/llm.module';

/**
 * AdminModule
 *
 * Admin-only endpoints (allow-listed via `ADMIN_EMAILS`). PrismaService and
 * SubscriptionService are already global, so we only need to declare the
 * controllers + guard here. UserErasureModule provides the shared Art. 17
 * erasure path (storage prefixes + pseudonymous usage trail + user row).
 *
 * `AdminLlmUsageController` serves the read-only token-usage analytics
 * (issue #525) aggregated over the rows `LlmUsageService` writes.
 */
@Module({
  imports: [UserErasureModule, LLMModule],
  controllers: [AdminController, AdminLlmUsageController],
  providers: [AdminGuard, AdminLlmUsageService],
})
export class AdminModule {}
