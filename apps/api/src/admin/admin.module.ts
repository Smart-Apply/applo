import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminLlmUsageController } from './llm-usage/admin-llm-usage.controller';
import { AdminLlmUsageService } from './llm-usage/admin-llm-usage.service';
import { LLMModule } from '../llm/llm.module';

/**
 * AdminModule
 *
 * Admin-only endpoints (allow-listed via `ADMIN_EMAILS`). PrismaService and
 * SubscriptionService are already global, so we only need to declare the
 * controllers + guard here. LLMModule provides LlmUsageService for the GDPR
 * erasure hook on admin account deletion (audit F11).
 *
 * `AdminLlmUsageController` serves the read-only token-usage analytics
 * (issue #525) aggregated over the rows `LlmUsageService` writes.
 */
@Module({
  imports: [LLMModule],
  controllers: [AdminController, AdminLlmUsageController],
  providers: [AdminGuard, AdminLlmUsageService],
})
export class AdminModule {}
