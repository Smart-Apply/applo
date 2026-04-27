import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – Smart Apply",
  description: "Impressum und Anbieterkennzeichnung gemäß § 5 TMG.",
  robots: { index: true, follow: false },
};

/**
 * Impressum (TMG § 5 / DDG § 5).
 *
 * IMPORTANT — before going public on Reddit:
 *   1. Fill in EVERY [BITTE EINFÜGEN] placeholder below with real data.
 *   2. If you do not want to publish your private address, use an
 *      Impressum service (e.g. impressumspflicht.de, IT-Recht Kanzlei,
 *      Trusted Shops) and paste their provided address here instead.
 *   3. Have the final text reviewed by a lawyer if you offer paid services.
 */
export default function ImpressumPage() {
  return (
    <>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Arianit Sheholli
        <br />
        [BITTE EINFÜGEN: Straße und Hausnummer]
        <br />
        [BITTE EINFÜGEN: PLZ Ort]
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{" "}
        <a href="mailto:support@smart-apply.io">support@smart-apply.io</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Arianit Sheholli
        <br />
        Adresse wie oben
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{" "}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://ec.europa.eu/consumers/odr/
        </a>
        . Unsere E-Mail-Adresse findest du oben im Impressum.
      </p>

      <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf
        diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8
        bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen oder
        nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
        hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden
        Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
        Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
        verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind
        als solche gekennzeichnet. Die Vervielfältigung, Bearbeitung,
        Verbreitung und jede Art der Verwertung außerhalb der Grenzen des
        Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
        Autors bzw. Erstellers.
      </p>
    </>
  );
}
