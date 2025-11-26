import { Module } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [PrismaModule, AgentsModule],
  providers: [KeywordsService],
  exports: [KeywordsService],
})
export class KeywordsModule {}
