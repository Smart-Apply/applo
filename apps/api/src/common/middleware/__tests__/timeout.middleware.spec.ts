import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { TimeoutMiddleware } from '../timeout.middleware';
import { ConfigService } from '../../../config/config.service';

/**
 * Unit tests for TimeoutMiddleware
 *
 * Tests verify that:
 * 1. Middleware sets a timeout for all requests
 * 2. Timeout is cleared when the response finishes / closes / errors
 * 3. A 408 response is sent (NOT thrown) when the timeout fires — throwing
 *    would become an uncaughtException and crash the Node process
 * 4. Timeout value is configurable via ConfigService
 */
describe('TimeoutMiddleware', () => {
  let middleware: TimeoutMiddleware;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      requestTimeoutMs: 1000, // 1s timeout for tests
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeoutMiddleware,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    middleware = module.get<TimeoutMiddleware>(TimeoutMiddleware);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('successful requests', () => {
    it('should call next() and register response listeners', () => {
      const mockReq = {} as Request;
      const mockRes = {
        on: jest.fn(),
        headersSent: false,
        writableEnded: false,
      } as any as Response;
      const mockNext = jest.fn() as NextFunction;

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRes.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should clear timeout when response finishes', () => {
      jest.useFakeTimers();

      const status = jest.fn().mockReturnThis();
      const json = jest.fn().mockReturnThis();
      const mockReq = { method: 'GET', path: '/api/test' } as Request;
      const mockRes = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
        status,
        json,
        headersSent: false,
        writableEnded: false,
      } as any as Response;
      const mockNext = jest.fn() as NextFunction;

      middleware.use(mockReq, mockRes, mockNext);

      // Advance time past the timeout — the cleared timer must NOT fire.
      jest.advanceTimersByTime(2000);

      expect(status).not.toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should clear timeout when the socket closes early', () => {
      jest.useFakeTimers();

      const status = jest.fn().mockReturnThis();
      const json = jest.fn().mockReturnThis();
      const mockRes = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback();
          }
        }),
        status,
        json,
        headersSent: false,
        writableEnded: false,
      } as any as Response;
      const mockNext = jest.fn() as NextFunction;

      middleware.use({} as Request, mockRes, mockNext);

      jest.advanceTimersByTime(2000);

      expect(status).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('timeout behavior', () => {
    it('should send a 408 response (NOT throw) when the timeout fires', () => {
      jest.useFakeTimers();

      const json = jest.fn().mockReturnThis();
      const status = jest.fn().mockReturnValue({ json });
      const mockReq = { method: 'POST', path: '/api/slow' } as Request;
      const mockRes = {
        on: jest.fn(),
        status,
        headersSent: false,
        writableEnded: false,
      } as any as Response;
      const mockNext = jest.fn() as NextFunction;

      middleware.use(mockReq, mockRes, mockNext);

      // Advancing past the timeout MUST NOT throw — throwing inside a
      // setTimeout becomes uncaughtException and kills the worker.
      expect(() => jest.advanceTimersByTime(1100)).not.toThrow();

      expect(status).toHaveBeenCalledWith(408);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 408,
          error: 'Request Timeout',
          message: expect.stringContaining('1s'),
        }),
      );

      jest.useRealTimers();
    });

    it('should not send a response if headers are already sent', () => {
      jest.useFakeTimers();

      const json = jest.fn().mockReturnThis();
      const status = jest.fn().mockReturnValue({ json });
      const mockReq = { method: 'GET', path: '/api/test' } as Request;
      const mockRes = {
        on: jest.fn(),
        status,
        headersSent: true, // e.g. SSE stream already opened
        writableEnded: false,
      } as any as Response;
      const mockNext = jest.fn() as NextFunction;

      middleware.use(mockReq, mockRes, mockNext);
      jest.advanceTimersByTime(1100);

      expect(status).not.toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should not send a response if writableEnded is true', () => {
      jest.useFakeTimers();

      const json = jest.fn().mockReturnThis();
      const status = jest.fn().mockReturnValue({ json });
      const mockRes = {
        on: jest.fn(),
        status,
        headersSent: false,
        writableEnded: true,
      } as any as Response;
      const mockNext = jest.fn() as NextFunction;

      middleware.use({} as Request, mockRes, mockNext);
      jest.advanceTimersByTime(1100);

      expect(status).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('configuration', () => {
    it('should use timeout from ConfigService', () => {
      const customConfigService = {
        requestTimeoutMs: 5000,
      } as any;

      const customMiddleware = new TimeoutMiddleware(customConfigService);

      expect(customMiddleware['timeoutMs']).toBe(5000);
    });
  });
});
