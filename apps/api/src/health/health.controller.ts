import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get('live')
  @Public()
  @HealthCheck()
  checkLiveness() {
    // Simple liveness check - just returns 200 if app is running
    return this.health.check([]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  checkReadiness() {
    // Readiness check - verifies database connection
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)]);
  }
}
