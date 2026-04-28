import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { QStashQueueProvider } from './providers/qstash-queue.provider';
import { JobType } from './interfaces/queue.interface';

/**
 * Public endpoint that receives webhook deliveries from Upstash QStash.
 *
 * Security model:
 *   1. Endpoint is unauthenticated (no JWT) — Upstash hits it without
 *      our user credentials.
 *   2. Authenticity is enforced by verifying the `Upstash-Signature` header
 *      against the raw request body using the signing keys stored on the
 *      QStash provider. Anyone POSTing without a valid signature gets 401.
 *   3. The payload schema is validated before dispatch — invalid bodies
 *      return 400 so QStash doesn't retry them.
 *
 * The endpoint is intentionally NOT documented in Swagger (@ApiExcludeController)
 * because it's an internal integration surface, not a public API.
 *
 * Rate limit / CSRF: skipped by design — Upstash is the only legitimate
 * caller, and signature verification is the trust boundary.
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('jobs')
export class QStashWebhookController {
  private readonly logger = new Logger(QStashWebhookController.name);

  constructor(
    // Direct injection of the provider (not via QUEUE_PROVIDER token) because
    // we need the provider-specific verifySignature() and dispatchWebhook()
    // methods that aren't part of the QueueProvider interface.
    //
    // Resolves to null when JOBS_DRIVER !== 'qstash' (see jobs.module.ts).
    // The controller is still mounted in that case so the URL stays stable
    // across deploys; requests get a 503.
    @Inject(QStashQueueProvider)
    private readonly qstash: QStashQueueProvider | null,
  ) {}

  @Post('qstash-webhook')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('upstash-signature') signature: string | undefined,
    @Headers('upstash-message-id') messageId: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ ok: true }> {
    if (!this.qstash) {
      // QStash isn't enabled. Return 503 so QStash retries (in case the
      // operator is mid-deploy flipping JOBS_DRIVER).
      throw new HttpException(
        'QStash provider not enabled on this instance',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!signature) {
      throw new HttpException('Missing Upstash-Signature header', HttpStatus.UNAUTHORIZED);
    }
    if (!req.rawBody) {
      // Should never happen: main.ts sets rawBody: true on NestFactory.create.
      this.logger.error('Webhook hit without rawBody — Nest rawBody option not enabled?');
      throw new HttpException('Server misconfiguration', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const rawBody = req.rawBody.toString('utf8');

    // Verify signature first — fast, no DB hits.
    try {
      await this.qstash.verifySignature(signature, rawBody);
    } catch (error) {
      this.logger.warn(`QStash signature verification failed: ${error.message}`);
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // Parse the verified body. Use rawBody (not req.body) so we trust only
    // the bytes we just verified.
    let payload: { type: JobType; data: unknown };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new HttpException('Invalid JSON body', HttpStatus.BAD_REQUEST);
    }

    if (!payload.type || !Object.values(JobType).includes(payload.type)) {
      throw new HttpException(
        `Unknown or missing job type: ${payload.type}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Dispatch. If the handler throws, return 500 so QStash schedules a retry.
    try {
      await this.qstash.dispatchWebhook(payload, messageId ?? `unknown-${Date.now()}`);
    } catch (error) {
      this.logger.error(`Job handler failed for ${payload.type}: ${error.message}`);
      // Re-throw with 500 so QStash retries (up to retries: 3 from publish()).
      throw new HttpException(
        `Job handler failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { ok: true };
  }
}
