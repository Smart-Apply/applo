import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LlmUsageService } from './llm-usage.service';

/**
 * Seeds the `LlmUsageService` actor scope from the authenticated request so
 * every LLM call made while handling this request (however deep in the
 * service graph) can attribute its usage row without every service/controller
 * threading `userId` through explicitly. No-op for non-HTTP contexts and
 * unauthenticated requests (JwtAuthGuard rejects those before they'd matter
 * anyway; this interceptor runs for public routes too).
 */
@Injectable()
export class LlmUsageContextInterceptor implements NestInterceptor {
  constructor(private readonly usage: LlmUsageService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = req.user?.id;
    if (!userId) return next.handle();

    // `next.handle()` only BUILDS the observable — the route handler actually
    // runs at subscription time, which Nest performs outside this function's
    // call stack. Returning `runWithActorSync(() => next.handle())` directly
    // would establish the AsyncLocalStorage scope only around the (synchronous,
    // near-instant) build step, not around the handler's execution — so every
    // LLM call downstream would see an empty actor context. Subscribing INSIDE
    // the scope is what keeps the context alive for the actual request handling.
    return new Observable((subscriber) => {
      this.usage.runWithActorSync({ userId }, () => next.handle().subscribe(subscriber));
    });
  }
}
