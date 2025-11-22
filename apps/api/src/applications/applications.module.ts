import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { StorageModule } from '../storage/storage.module';
import { LLMModule } from '../llm/llm.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { TitleGeneratorService } from './title-generator.service';

@Module({
  imports: [PrismaModule, JobsModule, StorageModule, LLMModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, TitleGeneratorService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
