import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import { join } from 'path';
import { initSentry } from './sentry';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { TransformInterceptor } from './common/interceptors';

// Load .env file only in development (not needed in production/Docker)
if (process.env.NODE_ENV !== 'production') {
  // Note: dotenv is a devDependency, not available in production
  try {
    const { config } = require('dotenv');
    config({ path: join(__dirname, '../../../.env') });
  } catch (error) {
    // Silently ignore in production where dotenv is not installed
  }
}

// Initialize Sentry as early as possible so module-instantiation errors are captured.
// No-op when SENTRY_DSN is not set.
const sentryEnabled = initSentry();

async function bootstrap() {
  // Create NestJS application with buffered logs
  // This ensures logs are captured even during early bootstrap phase
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Enable per-request rawBody capture so the QStash webhook controller
    // can verify Upstash-Signature against the unparsed payload bytes.
    // Has near-zero overhead for routes that don't read req.rawBody.
    rawBody: true,
  });

  // Use Pino logger as the global logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // Trust exactly ONE upstream proxy so that req.ip reflects the REAL
  // client IP from X-Forwarded-For instead of the proxy's connection IP.
  //
  // Topology in production:
  //   Cloudflare → nginx (host) → Docker bridge → Express (container)
  //
  // Inside the container the TCP peer is the Docker bridge gateway
  // (typically 172.x.x.x), NOT 127.0.0.1 — so a 'loopback' setting would
  // be silently ignored and ALL traffic would collapse into one
  // rate-limit bucket. We use the integer form `1` which means "trust
  // the LAST entry in X-Forwarded-For added by exactly one upstream
  // proxy" (our nginx). nginx, in turn, derives the real client IP from
  // Cloudflare's CF-Connecting-IP header (`real_ip_header` directive),
  // so the chain is end-to-end accurate.
  //
  // Spoofing concern: Express only ever sees connections from the Docker
  // bridge — never from the public internet — so trusting one hop here
  // is safe.
  app.set('trust proxy', 1);

  logger.log(`🚀 Starting Applo API in ${configService.nodeEnv} mode`, 'Bootstrap');
  if (sentryEnabled) {
    logger.log('📊 Sentry error tracking enabled', 'Bootstrap');
  } else {
    logger.warn('⚠️  Sentry disabled (set SENTRY_DSN to enable error tracking)', 'Bootstrap');
  }

  // Enhanced Helmet configuration with strict Content Security Policy (CSP)
  // CSP provides defense-in-depth protection against XSS attacks by controlling
  // which resources the browser is allowed to load and execute
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false, // We define explicit directives for clarity
        directives: {
          defaultSrc: ["'self'"], // Only allow resources from same origin by default
          scriptSrc: configService.isDevelopment
            ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Development: Swagger UI needs unsafe-inline/eval
            : ["'self'"], // Production: No inline scripts allowed
          styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles needed for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'], // Allow images from self, data URIs, and HTTPS
          connectSrc: ["'self'"], // API calls only to same origin
          fontSrc: ["'self'", 'data:'], // Fonts from self and data URIs
          objectSrc: ["'none'"], // Disallow plugins (Flash, Java, etc.)
          mediaSrc: ["'self'"], // Media from same origin only
          frameSrc: ["'none'"], // No iframes allowed
          frameAncestors: ["'none'"], // Prevent embedding in iframes (clickjacking protection)
          baseUri: ["'self'"], // Restrict base tag to prevent injection
          formAction: ["'self'"], // Forms can only submit to same origin
          // upgradeInsecureRequests: Helmet-specific behavior
          // Empty array [] enables the directive (production: force HTTPS)
          // null disables the directive (development: allow HTTP)
          upgradeInsecureRequests: configService.isProduction ? [] : null,
          reportUri: ['/api/v1/csp-violations'], // Report violations to our endpoint
        },
        reportOnly: configService.cspReportOnly, // Start with report-only mode for testing
      },
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true, // Enable HSTS preloading
      },
      frameguard: {
        action: 'deny', // Deny all framing attempts
      },
      noSniff: true, // Prevent MIME type sniffing
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin', // Privacy-preserving referrer policy
      },
    }),
  );

  logger.log(
    `🛡️  CSP configured in ${configService.cspReportOnly ? 'report-only' : 'enforcing'} mode`,
    'Bootstrap',
  );

  // Compression middleware - reduces bandwidth usage for large JSON responses
  // Compresses responses with gzip for 80%+ bandwidth reduction (150KB → 30KB)
  // Only enabled if ENABLE_COMPRESSION=true (default: true)
  if (configService.enableCompression) {
    app.use(
      compression({
        filter: (req, res) => {
          // Don't compress if client explicitly disables it
          if (req.headers['x-no-compression']) {
            return false;
          }
          // Don't compress PDF download endpoints - PDFs are already compressed
          // and double-compression corrupts them. Check URL since Content-Type
          // isn't set yet when middleware runs.
          if (req.url?.includes('/download/')) {
            return false;
          }
          // Use default compression filter (checks Accept-Encoding header)
          return compression.filter(req, res);
        },
        threshold: 1024, // Only compress responses larger than 1KB (avoid overhead for small responses)
        level: 6, // Balance between compression speed and ratio (0-9, where 6 is good default)
      }),
    );
    logger.log(
      '🗜️  Response compression enabled (gzip, level 6, threshold: 1KB, excludes /download/)',
      'Bootstrap',
    );
  } else {
    logger.warn(
      '⚠️  Response compression disabled (set ENABLE_COMPRESSION=true to enable)',
      'Bootstrap',
    );
  }

  // Cookie parser - must be before routes
  app.use(cookieParser());

  // CSRF Protection using Double Submit Cookie Pattern (Optional)
  // Enable with ENABLE_CSRF=true environment variable
  // This protects against CSRF attacks on state-changing operations
  let doubleCsrfProtection;
  if (configService.enableCsrf) {
    const {
      generateCsrfToken, // Generates a CSRF token pair (cookie + token)
      doubleCsrfProtection: csrfMiddleware, // Middleware to validate CSRF tokens
    } = doubleCsrf({
      getSecret: () => configService.jwtSecret, // Use JWT secret for CSRF token generation
      getSessionIdentifier: () => {
        // Stable identifier across the auth lifecycle. We deliberately do
        // NOT key off the access_token cookie: the frontend caches the
        // CSRF token for ~1h, but the access_token changes on login,
        // refresh, and logout. A varying session identifier would
        // invalidate every cached token the moment auth state changes
        // and surface as EBADCSRFTOKEN on the first mutation after login.
        //
        // Security note: the double-submit pattern remains effective
        // because the CSRF cookie is HttpOnly + Secure + SameSite=Lax and
        // the matching value must also be sent in X-CSRF-Token (which
        // cross-site requests cannot forge).
        return 'smart-apply';
      },
      // Use __Host- prefix only in production (requires HTTPS)
      // In development, use simple name (localhost doesn't support __Host- prefix)
      cookieName: configService.isProduction ? '__Host-csrf' : 'csrf',
      cookieOptions: {
        httpOnly: true,
        // Lax (not Strict) so Chrome's tracking protection doesn't drop
        // the CSRF cookie on cross-subdomain XHR
        // (frontend.smart-apply.io → api.smart-apply.io). Same fix as
        // the auth cookies in auth.controller.ts. Lax is sufficient
        // because the double-submit pattern requires the matching
        // X-CSRF-Token header anyway, which CSRF can't forge cross-site.
        sameSite: 'lax',
        secure: configService.isProduction, // HTTPS only in production
        path: '/',
      },
      size: 64, // Token size in bytes
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't require CSRF for read-only operations
      getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string, // Read token from custom header
      errorConfig: {
        statusCode: 403, // Forbidden
        message: 'Invalid or missing CSRF token',
        code: 'EBADCSRFTOKEN',
      },
    });

    doubleCsrfProtection = csrfMiddleware;

    // Store CSRF utilities in app instance for controllers to access
    app.set('csrfGenerateToken', generateCsrfToken);
    app.set('csrfProtection', doubleCsrfProtection);

    logger.log('🛡️  CSRF protection enabled', 'Bootstrap');
  } else {
    logger.warn('⚠️  CSRF protection disabled (set ENABLE_CSRF=true to enable)', 'Bootstrap');
  }

  // CORS configuration with restrictive policy
  // Only allows specified origins from CORS_ORIGINS environment variable
  // For production, set CORS_ORIGINS to your deployed frontend URLs
  // Example: CORS_ORIGINS=https://smartapply.azurewebsites.net,https://www.smartapply.com
  const corsOrigins = configService.corsOrigins;
  logger.log(`🌐 CORS enabled for origins: ${JSON.stringify(corsOrigins)}`, 'Bootstrap');

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Cache-Control'], // Cache-Control needed for SSE
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
      'Content-Type', // Expose Content-Type for SSE (text/event-stream)
    ], // Expose rate limit headers to frontend
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Allow extra properties in query params since some are extracted separately
      // e.g., includeJobPosting is extracted via @Query() decorator before PaginationQueryDto
      forbidNonWhitelisted: false,
      transform: true,
      disableErrorMessages: false,
      enableDebugMessages: true,
    }),
  );

  // Global response transformation - wraps all successful responses in { data, meta } format
  app.useGlobalInterceptors(new TransformInterceptor());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Apply CSRF protection globally if enabled (after API prefix)
  // This will validate CSRF tokens on all POST, PUT, DELETE, PATCH requests
  //
  // Paths that MUST bypass CSRF:
  // - /auth/refresh — protected by the HttpOnly refresh_token cookie. Adding
  //   CSRF here is a chicken-and-egg problem: the client needs a valid access
  //   token to fetch a CSRF token, but refresh is called precisely when the
  //   access token has expired.
  // - External webhooks — POSTed by third-party services (QStash, Microsoft
  //   Graph) that cannot carry our CSRF token. They authenticate via their own
  //   signature (Upstash-Signature) / per-connection clientState secret, which
  //   is the real trust boundary. Without these exemptions, enabling CSRF in
  //   prod silently 403s every QStash delivery → application generation jobs
  //   dead-letter and stick in GENERATING forever.
  const csrfExemptPaths = new Set([
    '/api/v1/auth/refresh',
    '/api/v1/jobs/qstash-webhook',
    '/api/v1/mailbox-sync/microsoft/webhook',
  ]);
  if (configService.enableCsrf && doubleCsrfProtection) {
    app.use((req, res, next) => {
      if (csrfExemptPaths.has(req.path)) {
        return next();
      }
      // Apply CSRF protection to all other routes
      doubleCsrfProtection(req, res, next);
    });
  }

  // Swagger/OpenAPI Documentation
  // Available in both development and production for better API discoverability
  // Access at: http://localhost:3000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Applo API')
    .setDescription(
      'AI-powered job application assistant API\n\n' +
        '## Features\n' +
        '- 🔐 JWT Authentication (HttpOnly cookies)\n' +
        '- 👤 User Profile Management\n' +
        '- 📝 Job Postings (Manual & Parser)\n' +
        '- 📄 Application Generation (LLM → PDF)\n' +
        '- 🎨 Custom Templates (Cover Letter & Resume)\n' +
        '- 📊 Real-time Status Updates (SSE)\n' +
        '- 🔒 Security Features (CSRF, Rate Limiting, XSS Protection)\n\n' +
        '## Authentication\n' +
        'This API uses JWT tokens stored in HttpOnly cookies for authentication. ' +
        'After logging in via `/auth/login`, the access token is automatically included in subsequent requests. ' +
        'Use the "Authorize" button to test endpoints in this UI.',
    )
    .setVersion('1.0')
    .setContact(
      'Applo Team',
      'https://github.com/Smart-Apply/smart-apply',
      'support@smartapply.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    // JWT Bearer Authentication (for manual testing)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token (without "Bearer " prefix)',
        in: 'header',
      },
      'JWT-auth', // This name must match @ApiBearerAuth() in controllers
    )
    // Cookie Authentication (primary authentication method)
    .addCookieAuth(
      'access_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'JWT access token stored in HttpOnly cookie (automatically sent after login)',
      },
      'cookie-auth',
    )
    // API Tags (organized by module)
    .addTag('auth', 'Authentication endpoints (register, login, logout, refresh)')
    .addTag('auth/sessions', 'Session management (list, revoke sessions)')
    .addTag('profile', 'User profile management (skills, experience, education)')
    .addTag('job-postings', 'Job postings management (manual creation & parser)')
    .addTag('applications', 'Application generation & management (LLM → PDF pipeline)')
    .addTag('templates', 'Template management (cover letter & resume templates)')
    .addTag('uploads', 'File uploads (PDF, DOCX)')
    .addTag('security', 'Security endpoints (CSP violation reporting)')
    // Server URLs
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.smart-apply.io', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey, // Use method name as operationId
  });

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Remember auth token in localStorage
      docExpansion: 'none', // Collapse all endpoints by default
      filter: true, // Enable search/filter
      showRequestDuration: true, // Show request duration in UI
      tryItOutEnabled: true, // Enable "Try it out" by default
      displayOperationId: false, // Hide operation IDs
      displayRequestDuration: true, // Show request duration
      tagsSorter: 'alpha', // Sort tags alphabetically
      operationsSorter: 'alpha', // Sort operations alphabetically
      defaultModelsExpandDepth: 2, // Expand models 2 levels deep
      defaultModelExpandDepth: 2, // Expand model schemas 2 levels deep
    },
    customSiteTitle: 'Applo API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 36px; }
    `,
  });

  logger.log(
    `📚 Swagger documentation available at: http://localhost:${configService.port}/docs`,
    'Bootstrap',
  );

  const port = configService.port;
  await app.listen(port);

  logger.log(`🚀 Application running on: http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`📝 Environment: ${configService.nodeEnv}`, 'Bootstrap');
  logger.log(`💾 Storage driver: ${configService.storageDriver}`, 'Bootstrap');
  logger.log(`🤖 LLM provider: ${configService.llmProvider}`, 'Bootstrap');
  logger.log(`📊 Log level: ${configService.logLevel}`, 'Bootstrap');
}

bootstrap();
