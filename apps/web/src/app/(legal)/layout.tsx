import Link from "next/link";
import { AppLogo } from '@/components/ui/app-logo';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo />
          </Link>
          <Link
            href="/"
            className="font-heading text-sm font-medium text-primary hover:opacity-70"
          >
            ← Zurück zur Startseite
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 md:px-8 md:py-16">
        <article className="prose prose-slate mx-auto max-w-3xl prose-headings:font-heading prose-headings:text-primary prose-h1:text-3xl prose-h1:font-bold prose-h2:mt-8 prose-h2:text-2xl prose-h2:font-semibold prose-h3:text-xl prose-a:text-brand prose-a:no-underline hover:prose-a:underline">
          {children}
        </article>
      </main>

      {/* Footer with cross-links between legal pages */}
      <footer className="mt-16 border-t border-border py-8">
        <div className="container mx-auto px-4 md:px-8">
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground">
              Datenschutz
            </Link>
            <Link href="/agb" className="hover:text-foreground">
              AGB
            </Link>
            <Link href="/" className="hover:text-foreground">
              Startseite
            </Link>
          </nav>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Applo. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
