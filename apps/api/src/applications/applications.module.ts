import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { StorageModule } from '../storage/storage.module';
import { LLMModule } from '../llm/llm.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { AgentsModule } from '../agents/agents.module';
import { TemplatesModule } from '../templates/templates.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { TitleGeneratorService } from './title-generator.service';
import { GroundingValidatorService } from './grounding/grounding-validator.service';

@Module({
  imports: [
    PrismaModule,
    JobsModule,
    StorageModule,
    LLMModule,
    KeywordsModule,
    AgentsModule,
    TemplatesModule,
    SubscriptionModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, TitleGeneratorService, GroundingValidatorService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
