import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { LLMModule } from '../llm/llm.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ConfigService } from '../config/config.service';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { InterviewQuestionGeneratorService } from './services/question-generator.service';
import { InterviewAnswerAnalyzerService } from './services/answer-analyzer.service';
import { InterviewFeedbackGeneratorService } from './services/feedback-generator.service';
import { VoiceInterviewService } from './voice/voice-interview.service';
import { VOICE_PROVIDER } from './voice/voice-provider.interface';
import { AzureRealtimeVoiceProvider } from './voice/providers/azure-realtime-voice.provider';
import { MockVoiceProvider } from './voice/providers/mock-voice.provider';

@Module({
  imports: [PrismaModule, LLMModule, SubscriptionModule, HttpModule],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    InterviewQuestionGeneratorService,
    InterviewAnswerAnalyzerService,
    InterviewFeedbackGeneratorService,
    VoiceInterviewService,
    {
      provide: VOICE_PROVIDER,
      useFactory: (configService: ConfigService, httpService: HttpService) =>
        configService.voiceProvider === 'azure-realtime'
          ? new AzureRealtimeVoiceProvider(httpService, configService)
          : new MockVoiceProvider(),
      inject: [ConfigService, HttpService],
    },
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}
