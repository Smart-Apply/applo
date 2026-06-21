import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LLMModule } from '../llm/llm.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PdfParser } from '../job-postings/parsers/pdf.parser';
import { DocxParser } from '../job-postings/parsers/docx.parser';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';

/**
 * ValidationModule — standalone application check (issue #569).
 *
 * Lets a user submit their OWN externally-created application (résumé + optional
 * cover letter + optional job context) and get an AI quality + ATS review.
 * Independent of the generation pipeline; metered via SubscriptionUsage.
 * Also exposes PDF/DOCX text extraction so users can upload instead of paste.
 */
@Module({
  imports: [PrismaModule, LLMModule, SubscriptionModule],
  controllers: [ValidationController],
  providers: [ValidationService, PdfParser, DocxParser],
  exports: [ValidationService],
})
export class ValidationModule {}
