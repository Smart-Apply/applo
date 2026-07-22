import type { Metadata, Viewport } from "next";
import { Inter, Archivo, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { CookieBanner } from "@/components/cookie-banner";
import { LocaleRuntimeSync } from "@/components/i18n/locale-runtime-sync";
import type { Locale } from "@/i18n/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-plex",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: '#40639C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// Base URL used to resolve relative metadata (OG/Twitter images, canonicals)
// into absolute URLs. Falls back to the production origin so social previews
// work even when NEXT_PUBLIC_APP_URL isn't set (e.g. Cloudflare prod bundle).
const metadataBase = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://applo.ai',
);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.meta');

  return {
    metadataBase,
    title: t('title'),
    description: t('description'),
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Applo',
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      images: ['/Logo/Full Logo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/Logo/Full Logo.png'],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <link rel="apple-touch-icon" href="/Logo/favicon-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Applo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#40639C" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.variable} ${archivo.variable} ${plexMono.variable} font-sans antialiased`}>
        <NextIntlClientProvider>
          <LocaleRuntimeSync locale={locale} />
          <ErrorBoundary>
            <Providers>{children}</Providers>
          </ErrorBoundary>
          <CookieBanner />
        </NextIntlClientProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
