import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupCron } from './cleanup.cron';
import { OrphanedUploadCron } from './orphaned-upload.cron';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { ConfigModule } from '../../config/config.module';
import { ApplicationsModule } from '../../applications/applications.module';
import { JobPostingsModule } from '../../job-postings/job-postings.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  // ApplicationsModule / JobPostingsModule are imported so the cron can reuse
  // the storage-coupled hard-delete paths instead of re-implementing deletion
  // (see the class doc on CleanupCron).
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    ApplicationsModule,
    JobPostingsModule,
    StorageModule,
  ],
  providers: [CleanupCron, OrphanedUploadCron, PrismaService, ConfigService],
  exports: [CleanupCron, OrphanedUploadCron],
})
export class CleanupCronModule {}
