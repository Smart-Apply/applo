import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

/**
 * Custom exception class that includes an error code for better error handling
 * 
 * Usage:
 * throw new CodedHttpException(HttpStatus.NOT_FOUND, ErrorCode.PROFILE_NOT_FOUND);
 * throw new CodedHttpException(HttpStatus.BAD_REQUEST, ErrorCode.PROFILE_INCOMPLETE, 'Additional context');
 */
export class CodedHttpException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: ErrorCode,
    message?: string,
    public readonly metadata?: Record<string, any>,
  ) {
    super(
      {
        statusCode: status,
        code,
        message: message || code,
        ...(metadata && { ...metadata }),
      },
      status,
    );
  }
}

/**
 * Convenience functions for common HTTP exceptions with error codes
 */

export class BadRequestWithCode extends CodedHttpException {
  constructor(code: ErrorCode, message?: string, metadata?: Record<string, any>) {
    super(HttpStatus.BAD_REQUEST, code, message, metadata);
  }
}

export class UnauthorizedWithCode extends CodedHttpException {
  constructor(code: ErrorCode, message?: string, metadata?: Record<string, any>) {
    super(HttpStatus.UNAUTHORIZED, code, message, metadata);
  }
}

export class ForbiddenWithCode extends CodedHttpException {
  constructor(code: ErrorCode, message?: string, metadata?: Record<string, any>) {
    super(HttpStatus.FORBIDDEN, code, message, metadata);
  }
}

export class NotFoundWithCode extends CodedHttpException {
  constructor(code: ErrorCode, message?: string, metadata?: Record<string, any>) {
    super(HttpStatus.NOT_FOUND, code, message, metadata);
  }
}

export class ConflictWithCode extends CodedHttpException {
  constructor(code: ErrorCode, message?: string, metadata?: Record<string, any>) {
    super(HttpStatus.CONFLICT, code, message, metadata);
  }
}

export class InternalServerErrorWithCode extends CodedHttpException {
  constructor(code: ErrorCode, message?: string, metadata?: Record<string, any>) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, code, message, metadata);
  }
}
