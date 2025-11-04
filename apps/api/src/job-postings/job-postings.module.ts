import { Module } from '@nestjs/common';
import { JobPostingsController } from './job-postings.controller';
import { JobPostingsService } from './job-postings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TextParser } from './parsers/text.parser';
import { UrlParser } from './parsers/url.parser';
import { PdfParser } from './parsers/pdf.parser';
import { DocxParser } from './parsers/docx.parser';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [JobPostingsController],
  providers: [JobPostingsService, TextParser, UrlParser, PdfParser, DocxParser],
  exports: [JobPostingsService],
})
export class JobPostingsModule {}
