import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';
import { TemplatesService } from '../templates/templates.service';
import { LLMService } from '../llm/llm.service';
import { Public } from '../common/decorators/public.decorator';
import { UseThrottler } from '../common/decorators/throttle.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';

/**
 * Custom health indicator for Storage Service
 */
@Injectable()
class StorageHealthIndicator extends HealthIndicator {
  constructor(private readonly storageService: StorageService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = await this.storageService.healthCheck();
    const result = this.getStatus('storage', isHealthy);

    if (isHealthy) {
      return result;
    }
    throw new Error('Storage service is not healthy');
  }
}

/**
 * Custom health indicator for Queue Service
 */
@Injectable()
class QueueHealthIndicator extends HealthIndicator {
  constructor(private readonly jobsService: JobsService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = await this.jobsService.healthCheck();
    const result = this.getStatus('queue', isHealthy);

    if (isHealthy) {
      return result;
    }
    throw new Error('Queue service is not healthy');
  }
}

/**
 * Custom health indicator for Templates Service
 */
@Injectable()
class TemplatesHealthIndicator extends HealthIndicator {
  constructor(private readonly templatesService: TemplatesService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = await this.templatesService.healthCheck();
    const result = this.getStatus('templates', isHealthy);

    if (isHealthy) {
      return result;
    }
    throw new Error('Templates service is not healthy');
  }
}

/**
 * Only the liveness/readiness probes are exempt from throttling (by URL, in
 * CustomThrottlerGuard). Everything else here runs under the generous
 * 'health-check' bucket: /health and /health/details used to be blanket-
 * exempt AND probe Azure OpenAI with a real chat-completions call on every
 * anonymous request — an unauthenticated cost/quota amplifier that once
 * opened the LLM circuit breaker via Azure 429s (audit 2026-08-13, F18;
 * fly.prod.toml documents the incident). The LLM probe is now admin-only
 * (/health/details), cached for 60s.
 */
@ApiTags('health')
@Controller('health')
@UseThrottler('health-check')
export class HealthController {
  /** TTL for the memoised LLM probe — even admin polling must not burn Azure TPM. */
  private static readonly LLM_PROBE_CACHE_MS = 60_000;
  private llmProbeCache: { healthy: boolean; at: number } | null = null;

  private storageIndicator: StorageHealthIndicator;
  private queueIndicator: QueueHealthIndicator;
  private templatesIndicator: TemplatesHealthIndicator;

  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private storageService: StorageService,
    private jobsService: JobsService,
    private templatesService: TemplatesService,
    private llmService: LLMService,
  ) {
    this.storageIndicator = new StorageHealthIndicator(storageService);
    this.queueIndicator = new QueueHealthIndicator(jobsService);
    this.templatesIndicator = new TemplatesHealthIndicator(templatesService);
  }

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check for the infrastructure dependencies' })
  @ApiResponse({ status: 200, description: 'All services are healthy' })
  @ApiResponse({ status: 503, description: 'One or more services are unhealthy' })
  async check() {
    // Deliberately NO LLM probe here: this endpoint is public, and the LLM
    // probe issues a real (billed, quota-consuming) Azure OpenAI request.
    // The LLM picture lives in /health/details, which is admin-gated.
    return this.health.check([
      // Database check
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Storage check
      () => this.storageIndicator.isHealthy(),

      // Queue check
      () => this.queueIndicator.isHealthy(),

      // Templates check
      () => this.templatesIndicator.isHealthy(),
    ]);
  }

  @Get('live')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe - checks if application is running' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  checkLiveness() {
    // Simple liveness check - just returns 200 if app is running
    return this.health.check([]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe - checks if application is ready to serve traffic' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  checkReadiness() {
    // Readiness check - verifies critical services (database + storage)
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.storageIndicator.isHealthy(),
    ]);
  }

  /**
   * Admin-gated: includes the LLM probe (a real Azure OpenAI request) and
   * echoes raw dependency error strings (internal hostnames, provider error
   * text) — neither belongs in an anonymous response. AdminGuard is
   * fail-closed on an empty ADMIN_EMAILS.
   */
  @Get('details')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detailed health status with response times for each dependency (admin only)' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 503, description: 'One or more services are unhealthy' })
  async checkDetails() {
    const startTime = Date.now();
    const details: Record<string, { status: 'up' | 'down'; responseTime: string; error?: string }> =
      {};

    // Database health check with timing
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      details.database = { status: 'up', responseTime: `${Date.now() - dbStart}ms` };
    } catch (error) {
      details.database = {
        status: 'down',
        responseTime: `${Date.now() - dbStart}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Storage health check with timing
    const storageStart = Date.now();
    try {
      const isHealthy = await this.storageService.healthCheck();
      details.storage = {
        status: isHealthy ? 'up' : 'down',
        responseTime: `${Date.now() - storageStart}ms`,
      };
    } catch (error) {
      details.storage = {
        status: 'down',
        responseTime: `${Date.now() - storageStart}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Queue health check with timing
    const queueStart = Date.now();
    try {
      const isHealthy = await this.jobsService.healthCheck();
      details.queue = {
        status: isHealthy ? 'up' : 'down',
        responseTime: `${Date.now() - queueStart}ms`,
      };
    } catch (error) {
      details.queue = {
        status: 'down',
        responseTime: `${Date.now() - queueStart}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Templates health check with timing
    const templatesStart = Date.now();
    try {
      const isHealthy = await this.templatesService.healthCheck();
      details.templates = {
        status: isHealthy ? 'up' : 'down',
        responseTime: `${Date.now() - templatesStart}ms`,
      };
    } catch (error) {
      details.templates = {
        status: 'down',
        responseTime: `${Date.now() - templatesStart}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // LLM health check with timing (memoised — see cachedLlmHealth)
    const llmStart = Date.now();
    try {
      const isHealthy = await this.cachedLlmHealth();
      details.llm = {
        status: isHealthy ? 'up' : 'down',
        responseTime: `${Date.now() - llmStart}ms`,
      };
    } catch (error) {
      details.llm = {
        status: 'down',
        responseTime: `${Date.now() - llmStart}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Determine overall status
    const allHealthy = Object.values(details).every((d) => d.status === 'up');
    const totalResponseTime = `${Date.now() - startTime}ms`;

    return {
      status: allHealthy ? 'ok' : 'error',
      totalResponseTime,
      timestamp: new Date().toISOString(),
      details,
    };
  }

  /**
   * LLM probe with a 60s memo. The underlying check issues a real Azure
   * OpenAI chat-completions request against the SAME TPM/RPM quota as the
   * product's generation path, so it must not run per poll. A thrown probe
   * is cached as unhealthy for the TTL too — repeated failures must not turn
   * into repeated Azure calls — but the first error still surfaces to the
   * caller's error field.
   */
  private async cachedLlmHealth(): Promise<boolean> {
    const cached = this.llmProbeCache;
    if (cached && Date.now() - cached.at < HealthController.LLM_PROBE_CACHE_MS) {
      return cached.healthy;
    }
    try {
      const healthy = await this.llmService.healthCheck();
      this.llmProbeCache = { healthy, at: Date.now() };
      return healthy;
    } catch (error) {
      this.llmProbeCache = { healthy: false, at: Date.now() };
      throw error;
    }
  }
}
