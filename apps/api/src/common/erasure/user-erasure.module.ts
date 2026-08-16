import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { LLMModule } from '../../llm/llm.module';
import { UserErasureService } from './user-erasure.service';

/**
 * Shared GDPR erasure path. Imported by both AuthModule (self-service
 * deletion) and AdminModule (support-driven deletion) so the two never drift.
 */
@Module({
  imports: [StorageModule, LLMModule],
  providers: [UserErasureService],
  exports: [UserErasureService],
})
export class UserErasureModule {}
