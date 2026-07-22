import { Module } from '@nestjs/common';
import { LLMModule } from '../../llm/llm.module';
import { TranslationService } from './translation.service';

/**
 * Content translation for cross-language exports. A standalone module (not
 * part of ApplicationsModule) because its consumer is the export job
 * processor in JobsModule — and ApplicationsModule already imports
 * JobsModule, so exporting the service from there would be circular.
 */
@Module({
  imports: [LLMModule],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
