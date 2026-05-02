import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../../config/config.service';

/**
 * Global request timeout middleware
 *
 * Prevents hanging requests from tying up worker threads indefinitely.
 * Sends a 408 Request Timeout response if a request exceeds the configured timeout.
 *
 * Configuration:
 * - REQUEST_TIMEOUT_MS: Global timeout in milliseconds (default: 30000 = 30s)
 *
 * Use cases:
 * - LLM requests that hang (circuit breaker handles degraded service, this handles total failure)
 * - Database queries that lock indefinitely
 * - External API calls that never respond
 * - PDF generation that runs too long
 *
 * IMPORTANT — DO NOT `throw` from inside the setTimeout callback.
 * Errors thrown asynchronously from a `setTimeout` are NOT caught by
 * Express/Nest's error pipeline; they bubble up to Node as
 * `uncaughtException` and crash the worker. When the worker dies mid-request
 * Fly's edge proxy returns 502 Bad Gateway with **no CORS headers**, which
 * surfaces in the browser as a CORS error even though the real cause is a
 * crashed process. Always write the response directly here instead.
 *
 * Notes:
 * - Applied globally; can be skipped per-route via `@SkipRequestTimeout()`.
 * - Clears the timer on response finish/close to prevent memory leaks.
 * - Does NOT interrupt async work in the handler (only prevents the response).
 */
@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TimeoutMiddleware.name);
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.timeoutMs = this.configService.requestTimeoutMs;
    this.logger.log(`⏱️  Global request timeout: ${this.timeoutMs}ms`);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Set timeout for this request
    const timeout = setTimeout(() => {
      // Only respond if nothing has been sent yet
      if (res.headersSent || res.writableEnded) {
        return;
      }

      this.logger.warn(`Request timeout after ${this.timeoutMs}ms: ${req.method} ${req.path}`);

      // Send a 408 directly. Throwing here would become an uncaughtException
      // and kill the Node process (see header comment above).
      try {
        res.status(408).json({
          statusCode: 408,
          error: 'Request Timeout',
          message: `Request timeout after ${this.timeoutMs / 1000}s. The server is taking too long to process your request. Please try again.`,
        });
      } catch (err) {
        // Last-resort: never let this callback throw out of the timer.
        this.logger.error(
          `Failed to write 408 timeout response: ${(err as Error).message}`,
        );
      }
    }, this.timeoutMs);

    // Clear timeout when response finishes or the socket closes
    const clear = () => clearTimeout(timeout);
    res.on('finish', clear);
    res.on('close', clear);
    res.on('error', clear);

    next();
  }
}
