import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { CookieBanner } from "@/components/cookie-banner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: '#2563eb',
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

export const metadata: Metadata = {
  metadataBase,
  title: "Applo - KI-gestützte Bewerbungen",
  description: "Erstelle personalisierte Bewerbungen mit KI-Unterstützung",
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
    title: 'Applo - KI-gestützte Bewerbungen',
    description: 'Erstelle personalisierte Bewerbungen mit KI-Unterstützung',
    images: ['/Logo/Full Logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Applo - KI-gestützte Bewerbungen',
    description: 'Erstelle personalisierte Bewerbungen mit KI-Unterstützung',
    images: ['/Logo/Full Logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <link rel="apple-touch-icon" href="/Logo/favicon-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Applo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
        <CookieBanner />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
