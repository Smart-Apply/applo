import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ATSKeywordAgent } from './ats/ats-keyword.agent';
import { CVWriterAgent } from './cv/cv-writer.agent';
import { CLWriterAgent } from './cl/cl-writer.agent';
import { ApplicationPipelineService } from './pipeline/application-pipeline.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot()],
  providers: [ATSKeywordAgent, CVWriterAgent, CLWriterAgent, ApplicationPipelineService],
  exports: [ATSKeywordAgent, CVWriterAgent, CLWriterAgent, ApplicationPipelineService],
})
export class AgentsModule {}
