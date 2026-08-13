import { Controller, Post, Query, Body, Logger, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';

import { MailboxSyncOrchestrator } from './mailbox-sync.orchestrator';
import { GraphWebhookBodyDto } from './dto/graph-webhook.dto';

/**
 * Public webhook for Microsoft Graph push notifications. Two responsibilities:
 *
 * 1) Validation handshake — when Graph creates a subscription it sends a
 *    GET-or-POST with `?validationToken=...`. We MUST echo the token back
 *    as plain text within 10 seconds, otherwise the subscription is rejected.
 *
 * 2) Change notifications — POST { value: [...] } with one or more
 *    notification entries. We respond 202 immediately and process the
 *    notifications in the background; if processing fails Graph will retry
 *    the SAME notification with the SAME messageId, which our orchestrator
 *    dedupes via the (mailboxConnectionId, providerMessageId) unique index.
 *
 * IMPORTANT: this endpoint must NOT require auth and must NOT be CSRF-checked.
 * We verify legitimacy with the per-connection `clientState` secret stored
 * in `mailbox_connections`.
 *
 * Abuse posture (security audit 2026-08-13, F19): the body is a validated DTO
 * class — the global ValidationPipe enforces the entry cap and field shapes —
 * and entries are grouped by subscription so one delivery costs at most one
 * connection lookup per distinct subscriptionId, not one per entry.
 */
@ApiTags('Email Tracking')
@Controller('mailbox-sync/microsoft')
export class MailboxWebhookController {
  private readonly logger = new Logger(MailboxWebhookController.name);

  constructor(private readonly orchestrator: MailboxSyncOrchestrator) {}

  @Post('webhook')
  // Deliberately unthrottled: Graph retries + subscription renewals must never
  // depend on the prod rate-limit env values. The DTO's ArrayMaxSize cap and
  // the per-subscription (not per-entry) DB lookup bound the work instead.
  @SkipThrottle()
  @ApiExcludeEndpoint() // no point documenting in Swagger — Microsoft is the only caller
  @ApiOperation({ summary: 'Microsoft Graph push notification webhook' })
  async handle(
    @Query('validationToken') validationToken: string | undefined,
    @Body() body: GraphWebhookBodyDto,
    @Res() res: Response,
  ): Promise<void> {
    // (1) Subscription-creation handshake.
    if (validationToken) {
      // Must be plain text, 200, body = the raw token. No JSON.
      res.status(HttpStatus.OK).type('text/plain').send(validationToken);
      return;
    }

    // (2) Change notifications.
    if (!body || !Array.isArray(body.value)) {
      // Empty body — ack with 202 so Graph doesn't retry. (A malformed or
      // over-cap body never reaches here: the ValidationPipe 400s it.)
      res.status(HttpStatus.ACCEPTED).send();
      return;
    }

    // ACK fast: kick off processing without awaiting it. Graph times out at
    // ~30s and we don't want LLM latency to make it think we're down.
    res.status(HttpStatus.ACCEPTED).send();

    // Group entries by (subscriptionId, clientState) so the orchestrator
    // resolves each connection and checks its clientState secret ONCE per
    // subscription. Processing stays sequential — the LLM and Graph token
    // endpoint are both global rate-limited and serial processing keeps
    // backpressure manageable.
    const groups = new Map<
      string,
      { subscriptionId: string; clientState: string; resources: string[] }
    >();
    for (const note of body.value) {
      if (!note.resource) {
        this.logger.warn(
          `Skipping notification without a resource for subscription ${note.subscriptionId}`,
        );
        continue;
      }
      const clientState = note.clientState ?? '';
      // JSON tuple key: collision-proof even if either attacker-suppliable
      // value contains a would-be separator character.
      const key = JSON.stringify([note.subscriptionId, clientState]);
      let group = groups.get(key);
      if (!group) {
        group = { subscriptionId: note.subscriptionId, clientState, resources: [] };
        groups.set(key, group);
      }
      group.resources.push(note.resource);
    }

    for (const group of groups.values()) {
      try {
        await this.orchestrator.processMicrosoftNotifications(group);
      } catch (err) {
        // Orchestrator already logs + records errors on the connection;
        // catching here just prevents one bad group from killing the loop.
        this.logger.error(
          `Unhandled error processing Graph notifications: ${(err as Error).message}`,
        );
      }
    }
  }
}
