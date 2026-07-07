import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Client, Receiver } from '@upstash/qstash';
import { QueueProvider, JobType, Job, JobStatus } from '../interfaces/queue.interface';
import { ConfigService } from '../../config/config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BackgroundJobStatus } from '../../generated/prisma/client';

/**
 * Upstash QStash queue provider.
 *
 * Architecture differs fundamentally from the in-memory and Service Bus
 * providers because QStash is **push-based**:
 *
 *   1. publish()  -> POST to QStash REST API; QStash schedules + persists
 *   2. QStash     -> POSTs the job body to QSTASH_WEBHOOK_URL when ready
 *   3. webhook    -> verifies the Upstash-Signature header, then dispatches
 *                    to the locally-registered handler for the job type.
 *
 * Why this is good for our setup:
 *   - Survives container restarts (jobs persist in QStash until delivered)
 *   - No polling, no long-lived TCP — fits Cloudflare Workers and any
 *     stateless host
 *   - Built-in retry with exponential backoff (configured via QStash dashboard)
 *   - Works behind the Azure VM's nginx already serving api.applo.ai
 *
 * Trade-offs vs in-memory:
 *   - +200-500ms latency per publish (network hop to qstash-eu-central-1)
 *   - Requires a publicly reachable webhook URL (no localhost in dev)
 *   - Free tier: 500 messages/day
 *
 * Job tracking: we still write to the BackgroundJob Postgres table for
 * status visibility; the QStash messageId is used as the job ID so a single
 * UUID lookup works across both stores.
 */
@Injectable()
export class QStashQueueProvider implements QueueProvider {
  private readonly logger = new Logger(QStashQueueProvider.name);
  private readonly client: Client;
  /** Verifies the Upstash-Signature header on inbound webhooks. */
  private readonly receiver: Receiver;
  /** Where QStash POSTs job bodies. Must be publicly reachable. */
  private readonly webhookUrl: string;
  /** Local in-process handler registry. Keyed by JobType. */
  private readonly handlers = new Map<JobType, (job: Job) => Promise<void>>();

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
  ) {
    const token = this.configService.qstashToken;
    const currentKey = this.configService.qstashCurrentSigningKey;
    const nextKey = this.configService.qstashNextSigningKey;
    this.webhookUrl = this.configService.qstashWebhookUrl;

    if (!token || !currentKey || !nextKey) {
      throw new Error(
        'QStash queue provider requires QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, and QSTASH_NEXT_SIGNING_KEY',
      );
    }

    this.client = new Client({ token });
    this.receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });

    this.logger.log(`QStash queue initialized (webhook: ${this.webhookUrl})`);
  }

  /**
   * Publish a job to QStash. Returns the QStash messageId, which we treat
   * as the job ID so the rest of the app can look it up uniformly.
   */
  async publish<T>(type: JobType, data: T): Promise<string> {
    try {
      const result = await this.client.publishJSON({
        url: this.webhookUrl,
        body: { type, data },
        // Prefix the messageId with our job-* convention so logs are consistent
        // across providers. The Upstash messageId is preserved as the suffix.
        retries: 3,
        // QStash will give up after 3 retries (1m, 5m, 30m intervals by default).
        // After that, the message goes to the DLQ visible in the QStash console.
      });

      const jobId = `qstash-${result.messageId}`;
      this.logger.log(`Published ${type} as ${jobId}`);
      return jobId;
    } catch (error) {
      this.logger.error(`Failed to publish ${type} to QStash: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register a handler for a job type. Stored in-memory; dispatched from
   * the webhook controller when QStash POSTs a matching job.
   */
  async subscribe(type: JobType, handler: (job: Job) => Promise<void>): Promise<void> {
    this.handlers.set(type, handler);
    this.logger.log(`Handler registered for job type: ${type}`);
  }

  async getJob(jobId: string): Promise<Job | null> {
    // QStash doesn't expose per-message status via SDK; rely on Postgres.
    try {
      const dbJob = await this.prisma.backgroundJob.findUnique({ where: { id: jobId } });
      if (!dbJob) return null;
      return {
        id: dbJob.id,
        type: dbJob.type as JobType,
        data: dbJob.data,
        status: dbJob.status as unknown as JobStatus,
        createdAt: dbJob.createdAt,
        startedAt: dbJob.startedAt ?? undefined,
        completedAt: dbJob.completedAt ?? undefined,
        error: dbJob.error ?? undefined,
        retryCount: dbJob.retryCount,
      };
    } catch (error) {
      this.logger.warn(`getJob lookup failed for ${jobId}: ${error.message}`);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    // QStash REST is HTTP — assume reachable. A real health check would
    // POST a no-op message which would burn a free-tier quota credit, so
    // we don't.
    return true;
  }

  // ---------------------------------------------------------------------
  // Webhook-side surface (called by QStashWebhookController)
  // ---------------------------------------------------------------------

  /**
   * Verify the Upstash-Signature header on an incoming webhook request.
   * Throws if invalid.
   */
  async verifySignature(signature: string, rawBody: string): Promise<void> {
    const valid = await this.receiver.verify({
      signature,
      body: rawBody,
      url: this.webhookUrl,
    });
    if (!valid) {
      throw new Error('Invalid Upstash-Signature');
    }
  }

  /**
   * Dispatch a verified webhook payload to the registered handler.
   * Called by the webhook controller AFTER signature verification.
   */
  async dispatchWebhook(payload: { type: JobType; data: unknown }, messageId: string): Promise<void> {
    const handler = this.handlers.get(payload.type);
    if (!handler) {
      this.logger.warn(`No handler registered for job type: ${payload.type}`);
      throw new Error(`No handler for job type: ${payload.type}`);
    }

    const job: Job = {
      id: `qstash-${messageId}`,
      type: payload.type,
      data: payload.data,
      status: JobStatus.PROCESSING,
      createdAt: new Date(),
      startedAt: new Date(),
      retryCount: 0,
    };

    // Update DB to PROCESSING. Use upsert — first delivery may run before
    // the publish() Postgres write commits, which would race.
    await this.prisma.backgroundJob.upsert({
      where: { id: job.id },
      create: {
        id: job.id,
        type: job.type,
        status: BackgroundJobStatus.PROCESSING,
        data: payload.data as object,
        startedAt: new Date(),
        maxRetries: 3,
      },
      update: {
        status: BackgroundJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    try {
      await handler(job);
      await this.prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: BackgroundJobStatus.COMPLETED, completedAt: new Date() },
      });
    } catch (error) {
      // Log + persist; rethrow so the controller returns non-2xx and QStash
      // schedules a retry.
      await this.prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: BackgroundJobStatus.FAILED,
          completedAt: new Date(),
          error: error.message,
        },
      });
      throw error;
    }
  }
}
