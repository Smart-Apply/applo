import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ – Applo",
  description:
    "Häufig gestellte Fragen zu Applo: geschlossene Beta, Einladungscodes, Bewerbungen, Lebenslauf, Anschreiben, Datenschutz und Preise.",
  robots: { index: true, follow: true },
};

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

/**
 * Public FAQ page. Rendered as a static, SEO-friendly server component
 * with `<details>`-based accordions so it works fully without JavaScript.
 *
 * Two sections:
 *   - Beta FAQs answer the most-likely questions from closed-beta
 *     invitees ("how does the invite code work", "why is <feature>
 *     flaky", "will I lose my data when the beta ends"). When the
 *     gate flips off (REQUIRE_INVITE_CODES=false), delete the
 *     `betaFaqs` array + the corresponding JSON-LD block + the
 *     `<BetaNotice />` block below. No other changes needed.
 *   - General FAQs are the long-lived product questions.
 *
 * To add or edit questions: just append to the relevant array. The
 * JSON-LD block at the bottom is built from both lists so Google can
 * show rich-result FAQ snippets in search.
 */
const betaFaqs: FaqItem[] = [
  {
    q: "Wie funktioniert der Einladungscode?",
    a: (
      <>
        Während der geschlossenen Beta ist die Registrierung nur mit einem
        persönlichen Einladungscode möglich (Format{" "}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
          BETA-XXXX-XXXX-XXXX
        </code>
        ). Den Code hast du per E-Mail bekommen — trage ihn unten auf der
        Registrierungsseite ein. Jeder Code lässt sich nur einmal
        einlösen.
      </>
    ),
  },
  {
    q: "Kann ich mich mit Google oder Microsoft anmelden?",
    a: (
      <>
        Während der Beta noch nicht: „Mit Google anmelden“ funktioniert nur
        für Konten, die bereits per E-Mail registriert sind. Lege also
        zuerst dein Konto mit Einladungscode + E-Mail an — danach kannst du
        in den Einstellungen Google oder Microsoft mit deinem Konto
        verknüpfen und dich damit anmelden.
      </>
    ),
  },
  {
    q: "Was kostet Applo während der Beta?",
    a: (
      <>
        Für alle Beta-Tester ist Applo kostenlos — inklusive aller
        Pro- und Premium-Features (E-Mail-Tracking,
        Interview-Coach, unbegrenzte Bewerbungen). Wenn du in der Beta
        aktiv mitgetestet hast, behältst du Premium auch nach dem offenen
        Launch ein Stück weit kostenlos — wir geben rechtzeitig Bescheid,
        wenn sich daran etwas ändert.
      </>
    ),
  },
  {
    q: "Was kann (noch) schiefgehen?",
    a: (
      <>
        Applo ist eine frühe Version. Erwartbare Stolperstellen:
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Vereinzelt brauchen Stellenanzeigen-URLs einen zweiten Versuch
          </li>
          <li>
            Die PDF-Vorschau lädt auf älteren iPhones manchmal langsam
          </li>
          <li>
            Lebenslauf-Upload (PDF/DOCX) klappt bei sehr exotischen
            Layouts nicht perfekt — dann am besten die Felder manuell
            ausfüllen
          </li>
          <li>
            Wenn eine neue Version live geht und du gerade ein
            Formular ausfüllst, erscheint oben rechts ein Hinweis
            „Neue Version verfügbar“ — klick auf „Jetzt aktualisieren“,
            sobald du fertig bist.
          </li>
        </ul>
      </>
    ),
  },
  {
    q: "Wie melde ich Fehler oder Feedback?",
    a: (
      <>
        Schreib uns an{" "}
        <a href="mailto:support@applo.ai" className="underline">
          support@applo.ai
        </a>
        . Für Beta-Tester antworten wir in der Regel innerhalb weniger
        Stunden. Hilfreich sind: Browser + Gerät, was du gemacht hast und
        was passiert ist (gern auch ein Screenshot). Frontend-Fehler
        landen automatisch in unserem Monitoring — du brauchst keine
        Konsolen-Logs zu kopieren.
      </>
    ),
  },
  {
    q: "Was passiert mit meinen Daten, wenn die Beta endet?",
    a: (
      <>
        Nichts — dein Konto und alle erstellten Bewerbungen bleiben
        erhalten und gehen 1-zu-1 in den offenen Launch über. Wir setzen
        die Datenbank nicht zurück. Wenn du dein Konto vorher löschen
        möchtest, geht das jederzeit unter Einstellungen → Konto löschen,
        und vorher kannst du alles als JSON exportieren (Einstellungen →
        Daten exportieren).
      </>
    ),
  },
];

const faqs: FaqItem[] = [
  {
    q: "Was macht Applo genau?",
    a: (
      <>
        Applo erstellt aus deinem Profil und einer Stellenanzeige in
        wenigen Sekunden ein passendes Anschreiben und einen optimierten
        Lebenslauf als PDF — beides individuell auf die jeweilige Stelle
        zugeschnitten. Du kannst die Texte direkt im Editor anpassen,
        bevor du sie herunterlädst.
      </>
    ),
  },
  {
    q: "Funktioniert Applo auch außerhalb von IT-Berufen?",
    a: (
      <>
        Ja. Applo ist bewusst branchenneutral entwickelt. Die
        Vorlagen und Prompts arbeiten u.&nbsp;a. mit Berufen aus
        Pflege, Vertrieb, Marketing, Handwerk, Verwaltung, Bildung und
        Logistik — nicht nur Tech.
      </>
    ),
  },
  {
    q: "In welcher Sprache werden meine Bewerbungen erstellt?",
    a: (
      <>
        Wir erkennen die Sprache der Stellenanzeige automatisch (aktuell
        Deutsch und Englisch) und erzeugen Anschreiben und Lebenslauf in
        derselben Sprache. Fachbegriffe (z.&nbsp;B. Tool-Namen) bleiben
        unverändert in ihrer üblichen Schreibweise.
      </>
    ),
  },
  {
    q: "Was passiert mit meinen Daten?",
    a: (
      <>
        Deine Profil- und Bewerbungsdaten liegen verschlüsselt in einer
        EU-Datenbank (Microsoft Azure, Schweden). Wir verkaufen oder
        verwenden deine Daten nicht für Werbung oder zum Trainieren von
        Modellen. Details findest du in unserer{" "}
        <Link href="/datenschutz" className="underline">
          Datenschutzerklärung
        </Link>
        . Du kannst deine Daten jederzeit unter „Einstellungen → Daten
        exportieren&quot; herunterladen oder dein Konto vollständig
        löschen.
      </>
    ),
  },
  {
    q: "Was kostet Applo?",
    a: (
      <>
        Der Einstieg ist kostenlos und ohne Kreditkarte. Im Free-Plan kannst
        du Applo mit 3 Bewerbungen pro Monat in Ruhe ausprobieren. Pro
        (9,99 € / Monat) hilft dir, jede Bewerbung mit KI zu optimieren.
        Premium (19,99 € / Monat) ergänzt das um
        E-Mail-Tracking und Interview-Coach. Alle Preise sind
        transparent, monatlich kündbar und ohne versteckte Kosten — Details
        auf unserer{" "}
        <Link href="/#pricing" className="underline">
          Preisseite
        </Link>
        .
      </>
    ),
  },
  {
    q: "Wie kann ich meine Bewerbung nach der Generierung noch anpassen?",
    a: (
      <>
        Nach der Generierung öffnet sich automatisch ein Editor, in dem du
        Anschreiben und Lebenslauf direkt im Browser bearbeiten und neu
        als PDF exportieren kannst — ohne erneute Generierung und ohne
        Token zu verbrauchen.
      </>
    ),
  },
  {
    q: "Sind die generierten Lebensläufe ATS-kompatibel?",
    a: (
      <>
        Ja. Alle PDF-Vorlagen sind so gebaut, dass sie von gängigen
        Bewerber-Tracking-Systemen (ATS) korrekt gelesen werden:
        einspaltiges Layout, einfache HTML-Struktur, keine Tabellen oder
        Grafiken in kritischen Bereichen, klare Section-Header und
        Standard-Schriftarten.
      </>
    ),
  },
  {
    q: "Ich habe einen Fehler gefunden oder eine Idee — wo melde ich mich?",
    a: (
      <>
        Schreib uns über das Kontaktformular auf der{" "}
        <Link href="/" className="underline">
          Startseite
        </Link>{" "}
        oder direkt an{" "}
        <a href="mailto:support@applo.ai" className="underline">
          support@applo.ai
        </a>
        . Wir antworten in der Regel innerhalb von 1–2 Werktagen.
      </>
    ),
  },
];

/**
 * Build JSON-LD FAQPage schema from the visible Q&A list.
 *
 * Google's FAQ rich result requires plain-text answers, so we extract
 * just the text from each ReactNode by toString()-ing children where
 * possible. For more complex nodes (links / formatting), we fall back
 * to a static plain-text version below.
 */
const faqsForJsonLd: { q: string; a: string }[] = [
  // Beta block — delete this block when REQUIRE_INVITE_CODES flips off.
  {
    q: "Wie funktioniert der Einladungscode?",
    a: "Während der geschlossenen Beta ist die Registrierung nur mit persönlichem Einladungscode (Format BETA-XXXX-XXXX-XXXX) möglich. Du hast den Code per E-Mail erhalten; trage ihn auf der Registrierungsseite ein. Jeder Code ist nur einmal einlösbar.",
  },
  {
    q: "Kann ich mich mit Google oder Microsoft anmelden?",
    a: "Während der Beta nur für bereits per E-Mail registrierte Konten. Erstelle dein Konto zuerst mit Einladungscode + E-Mail, danach kannst du Google oder Microsoft in den Einstellungen verknüpfen.",
  },
  {
    q: "Was kostet Applo während der Beta?",
    a: "Für alle Beta-Tester ist Applo komplett kostenlos — alle Pro- und Premium-Features inklusive. Aktive Beta-Tester behalten auch nach dem offenen Launch Premium ein Stück weit kostenlos.",
  },
  {
    q: "Was kann in der Beta noch schiefgehen?",
    a: "Bekannte Stolperstellen: Stellen-URLs brauchen vereinzelt einen zweiten Versuch, PDF-Vorschau ist auf älteren iPhones langsam, Lebenslauf-Upload trifft exotische Layouts nicht perfekt. Wenn eine neue Version live geht, siehst du oben rechts einen „Neue Version verfügbar“ Hinweis — klick auf „Jetzt aktualisieren“, wenn dir passt.",
  },
  {
    q: "Wie melde ich Fehler oder Feedback während der Beta?",
    a: "Per E-Mail an support@applo.ai. Antwort meist innerhalb weniger Stunden. Frontend-Fehler landen automatisch in unserem Monitoring — keine Konsolen-Logs nötig.",
  },
  {
    q: "Was passiert mit meinen Daten, wenn die Beta endet?",
    a: "Nichts — dein Konto und alle Bewerbungen bleiben erhalten und gehen direkt in den offenen Launch über. Du kannst jederzeit unter Einstellungen Daten exportieren oder dein Konto löschen.",
  },
  // End beta block.
  {
    q: "Was macht Applo genau?",
    a: "Applo erstellt aus deinem Profil und einer Stellenanzeige in wenigen Sekunden ein passendes Anschreiben und einen optimierten Lebenslauf als PDF — individuell auf die jeweilige Stelle zugeschnitten.",
  },
  {
    q: "Funktioniert Applo auch außerhalb von IT-Berufen?",
    a: "Ja. Applo ist bewusst branchenneutral entwickelt und arbeitet mit Berufen aus Pflege, Vertrieb, Marketing, Handwerk, Verwaltung, Bildung und Logistik — nicht nur Tech.",
  },
  {
    q: "In welcher Sprache werden meine Bewerbungen erstellt?",
    a: "Wir erkennen die Sprache der Stellenanzeige automatisch (Deutsch oder Englisch) und erzeugen Anschreiben und Lebenslauf in derselben Sprache.",
  },
  {
    q: "Was passiert mit meinen Daten?",
    a: "Deine Daten liegen verschlüsselt in einer EU-Datenbank (Microsoft Azure, Schweden). Wir verkaufen sie nicht und nutzen sie nicht für Werbung oder Modelltraining. Du kannst deine Daten jederzeit exportieren oder dein Konto löschen.",
  },
  {
    q: "Was kostet Applo?",
    a: "Der Einstieg ist kostenlos und ohne Kreditkarte: Free umfasst 3 Bewerbungen pro Monat. Pro kostet 9,99 € / Monat und optimiert jede Bewerbung mit KI. Premium kostet 19,99 € / Monat und ergänzt das um E-Mail-Tracking und Interview-Coach. Monatlich kündbar, keine versteckten Kosten.",
  },
  {
    q: "Wie kann ich meine Bewerbung nach der Generierung noch anpassen?",
    a: "Nach der Generierung kannst du Anschreiben und Lebenslauf direkt im Browser-Editor bearbeiten und neu als PDF exportieren, ohne dass das eine erneute Generierung kostet.",
  },
  {
    q: "Sind die generierten Lebensläufe ATS-kompatibel?",
    a: "Ja. Alle PDF-Vorlagen verwenden ein einspaltiges Layout, einfache HTML-Struktur, klare Section-Header und Standard-Schriftarten — gängige Bewerber-Tracking-Systeme können sie zuverlässig parsen.",
  },
  {
    q: "Ich habe einen Fehler gefunden oder eine Idee — wo melde ich mich?",
    a: "Über das Kontaktformular auf der Startseite oder direkt per Mail an support@applo.ai. Antwort meist innerhalb von 1–2 Werktagen.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqsForJsonLd.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <h1>Häufige Fragen (FAQ)</h1>
      <p>
        Antworten auf die häufigsten Fragen zu Applo. Findest du
        deine Frage nicht? Schreib uns über das Kontaktformular auf der{" "}
        <Link href="/" className="underline">
          Startseite
        </Link>
        .
      </p>

      {/* Beta notice — visually highlights that we're in closed beta and
          frames the next section. When REQUIRE_INVITE_CODES flips off,
          delete this <aside> + the betaFaqs array + the matching JSON-LD
          entries above. */}
      <aside
        role="note"
        aria-label="Hinweis zur geschlossenen Beta"
        className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
      >
        <strong className="font-semibold">
          Applo ist gerade in der geschlossenen Beta.
        </strong>{" "}
        Die Registrierung erfolgt nur per Einladungscode, alle Features
        sind während der Beta kostenlos, und du hilfst uns aktiv dabei,
        Rauheiten zu finden — vielen Dank!
      </aside>

      <section aria-labelledby="beta-faq-heading" className="mt-8">
        <h2 id="beta-faq-heading" className="text-xl font-semibold">
          Während der geschlossenen Beta
        </h2>
        <div className="mt-3 space-y-3">
          {betaFaqs.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-lg border border-gray-200 bg-white p-4 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between font-poppins text-base font-semibold text-[#1B2A49] [&::-webkit-details-marker]:hidden">
                <span>{q}</span>
                <span
                  className="ml-4 select-none text-xl text-gray-400 transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 text-gray-700 leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="general-faq-heading" className="mt-10">
        <h2 id="general-faq-heading" className="text-xl font-semibold">
          Allgemein
        </h2>
        <div className="mt-3 space-y-3">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-lg border border-gray-200 bg-white p-4 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between font-poppins text-base font-semibold text-[#1B2A49] [&::-webkit-details-marker]:hidden">
                <span>{q}</span>
                <span
                  className="ml-4 select-none text-xl text-gray-400 transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 text-gray-700 leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Structured data for Google's FAQ rich result */}
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
