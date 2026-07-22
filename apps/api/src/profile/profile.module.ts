import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { ResumeParserModule } from '../resume-parser/resume-parser.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, KeywordsModule, ResumeParserModule, StorageModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
