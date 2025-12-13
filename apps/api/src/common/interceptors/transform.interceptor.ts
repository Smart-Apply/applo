import { Injectable, NestInterceptor, ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common';
import { Observable, isObservable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard API response wrapper with data and metadata
 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Check if the data looks like an SSE MessageEvent
 */
function isMessageEvent(data: any): boolean {
  return data && typeof data === 'object' && 'data' in data && Object.keys(data).length <= 3;
}

/**
 * TransformInterceptor - Standardizes all API responses
 * 
 * Wraps controller responses in a consistent format:
 * {
 *   data: <controller response>,
 *   meta: {
 *     timestamp: ISO 8601 timestamp
 *   }
 * }
 * 
 * This interceptor is applied globally to all endpoints.
 * Errors are handled separately by AllExceptionsFilter.
 * 
 * Note: StreamableFile responses (binary file downloads) and SSE MessageEvents
 * are passed through without transformation to preserve their format.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if this is an SSE endpoint by looking at response headers
    const response = context.switchToHttp().getResponse();
    const contentType = response.getHeader?.('Content-Type');
    
    // SSE endpoints set Content-Type: text/event-stream - skip transformation
    if (contentType && String(contentType).includes('text/event-stream')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Don't wrap StreamableFile responses - they need to be streamed as binary
        if (data instanceof StreamableFile) {
          return data;
        }
        // Don't wrap SSE MessageEvent objects - they have a specific format
        if (isMessageEvent(data)) {
          return data;
        }
        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
