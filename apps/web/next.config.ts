import type { NextConfig } from "next";
import path from "path";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

// Cookie-based i18n (de/en) without URL routing — per-request config
// lives in src/i18n/request.ts (the plugin's default lookup path).
const withNextIntl = createNextIntlPlugin();

// Bundle analyzer for webpack analysis (ANALYZE=true npm run build)
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// When building for Cloudflare Workers via OpenNext, disable Next features
// that don't translate to the Workers runtime (standalone output, sharp-based
// image optimization). Existing Docker/VM build path is unchanged.
const isOpenNextBuild = process.env.OPEN_NEXT === 'true';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Standalone output for Docker deployment.
  // Skipped for OpenNext (Workers) — OpenNext produces its own bundle.
  output: isOpenNextBuild ? undefined : 'standalone',

  // Monorepo file tracing
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Enable gzip compression for production builds (default: true in production)
  // This compresses static assets and API responses, reducing bandwidth usage
  compress: true,

  // Optimized image configuration
  images: {
    // Sharp isn't available in the Workers runtime, so disable Next.js image
    // optimization when building for OpenNext (still works on the VM build).
    // Re-enable later via Cloudflare Images binding if needed.
    unoptimized: isOpenNextBuild,
    // Modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Device widths for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize external requests
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    // Remote patterns for external images
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/v1/templates/*/preview',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
        pathname: '/**',
      },
      {
        // Cloudflare R2 presigned URLs (when STORAGE_DRIVER=r2 on backend)
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        pathname: '/**',
      },
    ],
  },

  // Experimental optimizations for package imports
  // Tree-shaking optimization for large icon libraries
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Security headers for enhanced XSS and clickjacking protection
  // Note: CSP is now set dynamically in middleware.ts for runtime API URL support
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks by denying iframe embedding
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control how much referrer information is sent
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Restrict access to sensitive browser features. Microphone is
          // allowed for same-origin (the voice interview needs getUserMedia).
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          // Strict Transport Security (HSTS) - only in production with HTTPS
          // Forces browsers to use HTTPS for all future requests
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          }] : []),
        ],
      },
    ];
  },
};

// Sentry build-time wiring. The runtime SDK is initialised in
// src/instrumentation-client.ts; this wrapper only handles source-map upload,
// without which every stack trace in Sentry points at minified chunk offsets.
//
// org/project/authToken come from the environment so no slug or credential is
// committed. Upload is skipped when SENTRY_AUTH_TOKEN is unset, so local and
// contributor builds are unaffected.
//
// Bundle-size note: the frontend SDK was once removed to keep the Cloudflare
// Workers script under the 3 MB free-tier limit. `disableLogger` strips
// Sentry's own logging code, and source maps are deleted after upload so they
// are never served (both a size and a source-disclosure concern).
export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Associates the release (NEXT_PUBLIC_SENTRY_RELEASE = the deploy SHA) with
  // its commits, which is what powers suspect commits in the Sentry UI. Needs
  // full git history: the deploy workflows check out with fetch-depth: 0 for
  // this reason — with the default shallow clone it warns and skips.
  release: {
    setCommits: {
      auto: true,
    },
  },

  // Client-only integration. There is no sentry.server.config.ts, because the
  // Worker runtime would need the separate @sentry/cloudflare adapter and the
  // NestJS API already reports server errors via @sentry/node. These flags
  // stop the build wrapping server functions and middleware with an SDK that
  // can never initialise — the middleware sets the CSP, so leaving it
  // unwrapped is the safer default. Measured size effect: negligible (~0.06
  // KiB); the SDK's real cost is entering the module graph at all.
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
  autoInstrumentAppDirectory: false,
});

