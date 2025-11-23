import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import * as UAParser from 'ua-parser-js';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new session for the user
   */
  async createSession(
    userId: string,
    refreshTokenId: string,
    req: Request,
  ): Promise<any> {
    const parser = new UAParser.UAParser(req.headers['user-agent']);
    const device = parser.getResult();

    // Check session limit
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length >= 5) {
      // Remove oldest session (FIFO)
      await this.revokeSession(activeSessions[activeSessions.length - 1].id);
    }

    // Calculate session expiration (30 days to match refresh token)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.session.create({
      data: {
        userId,
        refreshTokenId,
        deviceName: this.getDeviceName(device),
        deviceType: device.device.type || 'desktop',
        browser: `${device.browser.name || 'Unknown'} ${device.browser.version || ''}`.trim(),
        os: `${device.os.name || 'Unknown'} ${device.os.version || ''}`.trim(),
        ipAddress: this.getClientIp(req),
        expiresAt,
      },
    });
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Update the last active timestamp for a session
   */
  async updateLastActive(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all sessions for a user (except optionally one)
   */
  async revokeAllSessions(
    userId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke session by refresh token ID
   */
  async revokeSessionByRefreshToken(refreshTokenId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        refreshTokenId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Find session by refresh token ID
   */
  async findSessionByRefreshToken(refreshTokenId: string) {
    return this.prisma.session.findFirst({
      where: {
        refreshTokenId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Cleanup expired sessions (run as cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            AND: [
              { isActive: false },
              // Clean up revoked sessions older than 30 days
              { revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
          },
        ],
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedArray = Array.isArray(forwarded) ? forwarded : forwarded.split(',');
      return forwardedArray[0].trim();
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Generate device name from user agent
   */
  private getDeviceName(device: UAParser.IResult): string {
    if (device.device.model) {
      return device.device.model;
    }
    
    const browser = device.browser.name || 'Unknown Browser';
    const os = device.os.name || 'Unknown OS';
    return `${browser} on ${os}`;
  }

  /**
   * Hash token for storage (used for refresh token)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
