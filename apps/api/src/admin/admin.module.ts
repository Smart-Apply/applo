import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { LLMModule } from '../llm/llm.module';

/**
 * AdminModule
 *
 * Admin-only endpoints (allow-listed via `ADMIN_EMAILS`). PrismaService and
 * SubscriptionService are already global, so we only need to declare the
 * controller + guard here. LLMModule provides LlmUsageService for the GDPR
 * erasure hook on admin account deletion (audit F11).
 */
@Module({
  imports: [LLMModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
