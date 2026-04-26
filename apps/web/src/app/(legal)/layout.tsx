import Link from "next/link";
import Image from "next/image";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/Logo/Full Logo.png"
              alt="Smart Apply"
              width={140}
              height={40}
              priority
            />
          </Link>
          <Link
            href="/"
            className="font-poppins text-sm font-medium text-[#1B2A49] hover:opacity-70"
          >
            ← Zurück zur Startseite
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 md:px-8 md:py-16">
        <article className="prose prose-slate mx-auto max-w-3xl font-poppins prose-headings:font-poppins prose-headings:text-[#1B2A49] prose-h1:text-3xl prose-h1:font-bold prose-h2:mt-8 prose-h2:text-2xl prose-h2:font-semibold prose-h3:text-xl prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
          {children}
        </article>
      </main>

      {/* Footer with cross-links between legal pages */}
      <footer className="mt-16 border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 md:px-8">
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm font-poppins text-gray-600">
            <Link href="/impressum" className="hover:text-[#1B2A49]">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-[#1B2A49]">
              Datenschutz
            </Link>
            <Link href="/agb" className="hover:text-[#1B2A49]">
              AGB
            </Link>
            <Link href="/" className="hover:text-[#1B2A49]">
              Startseite
            </Link>
          </nav>
          <p className="mt-4 text-center text-xs font-poppins text-gray-500">
            © {new Date().getFullYear()} Smart Apply. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
