import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen – Smart Apply",
  description: "Nutzungsbedingungen für die Smart Apply Plattform.",
  robots: { index: true, follow: false },
};

/**
 * Terms of Service (AGB) — MVP-friendly template for a free service.
 *
 * IMPORTANT — before going public:
 *   1. Fill in [BITTE EINFÜGEN] placeholders.
 *   2. If you ever introduce paid tiers, add a Widerrufsbelehrung
 *      (right of withdrawal) and update the liability/payment sections —
 *      consult a lawyer.
 */
export default function AgbPage() {
  return (
    <>
      <h1>Allgemeine Geschäftsbedingungen</h1>

      <p>
        <em>
          Stand: {new Date().toLocaleDateString("de-DE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </em>
      </p>

      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen (&bdquo;AGB&rdquo;) gelten für
        die Nutzung der Plattform &bdquo;Smart Apply&rdquo;, betrieben von
        Arianit Sheholli, [BITTE EINFÜGEN: Anschrift]
        (&bdquo;Anbieter&rdquo;), durch registrierte Nutzerinnen und Nutzer
        (&bdquo;Nutzer&rdquo;).
      </p>

      <h2>§ 2 Leistungsbeschreibung</h2>
      <p>
        Smart Apply ist eine Online-Plattform zur KI-gestützten Erstellung
        personalisierter Anschreiben und Lebensläufe auf Basis vom Nutzer
        bereitgestellter Profildaten und Stellenanzeigen. Die Plattform wird
        als &bdquo;Software-as-a-Service&rdquo; bereitgestellt und steht in der
        aktuellen Ausbaustufe (MVP / Beta) kostenfrei zur Verfügung.
      </p>
      <p>
        Der Anbieter behält sich vor, Funktionen zu erweitern, einzuschränken
        oder einzustellen sowie zukünftig kostenpflichtige Tarife einzuführen.
      </p>

      <h2>§ 3 Registrierung und Account</h2>
      <ul>
        <li>
          Voraussetzung für die Nutzung ist eine Registrierung mit gültiger
          E-Mail-Adresse oder über einen unterstützten OAuth-Anbieter.
        </li>
        <li>
          Der Nutzer muss volljährig sein. Minderjährige dürfen die Plattform
          nur mit Zustimmung der Erziehungsberechtigten nutzen.
        </li>
        <li>
          Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten und
          den Anbieter unverzüglich über unautorisierte Zugriffe zu informieren.
        </li>
        <li>Pro Person ist nur ein Account zulässig.</li>
      </ul>

      <h2>§ 4 Nutzungslimits und faire Nutzung</h2>
      <p>
        Zum Schutz des Betriebs und zur Vermeidung von Missbrauch gelten
        Nutzungslimits, insbesondere bei der Anzahl generierter Bewerbungen
        pro Tag, Woche und Monat. Die jeweils geltenden Limits werden im
        Dashboard angezeigt. Der Anbieter kann Limits anpassen, sofern dies
        sachlich begründet ist.
      </p>

      <h2>§ 5 Pflichten des Nutzers</h2>
      <p>Der Nutzer verpflichtet sich,</p>
      <ul>
        <li>
          ausschließlich wahrheitsgemäße Profilangaben zu machen und die
          Plattform nicht für Identitätstäuschungen zu nutzen,
        </li>
        <li>
          keine rechtswidrigen, beleidigenden, diskriminierenden oder
          urheberrechtsverletzenden Inhalte einzustellen,
        </li>
        <li>
          keine automatisierten Anfragen oder Scraping-Werkzeuge gegen die
          Plattform einzusetzen,
        </li>
        <li>
          die generierten Bewerbungsunterlagen vor dem Versand inhaltlich zu
          prüfen.
        </li>
      </ul>

      <h2>§ 6 Geistiges Eigentum</h2>
      <p>
        Alle Rechte an der Software, dem Design und den Templates verbleiben
        beim Anbieter. Der Nutzer erhält an den von ihm generierten und
        heruntergeladenen Bewerbungsunterlagen ein einfaches, zeitlich
        unbefristetes Nutzungsrecht für eigene Zwecke.
      </p>
      <p>
        Vom Nutzer eingegebene Inhalte (Profildaten, Stellenanzeigen) bleiben
        sein Eigentum. Der Anbieter darf diese ausschließlich zur Erbringung
        der Leistung verarbeiten.
      </p>

      <h2>§ 7 KI-generierte Inhalte – Haftungsausschluss</h2>
      <p>
        Die generierten Bewerbungsunterlagen werden mittels großer
        Sprachmodelle (LLMs) erstellt und können fehlerhafte oder
        unangemessene Formulierungen enthalten. Der Nutzer ist allein dafür
        verantwortlich, die Inhalte vor dem Versand auf Richtigkeit,
        Vollständigkeit und Eignung zu prüfen. Der Anbieter übernimmt keine
        Gewähr für Bewerbungserfolg, sachliche Richtigkeit oder rechtliche
        Zulässigkeit der generierten Inhalte.
      </p>

      <h2>§ 8 Haftung</h2>
      <p>
        Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit
        sowie nach den Vorschriften des Produkthaftungsgesetzes. Bei leicht
        fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung
        auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Eine
        weitergehende Haftung ist ausgeschlossen.
      </p>
      <p>
        Da die Leistung in der MVP-Phase unentgeltlich erbracht wird, haftet
        der Anbieter zudem nur nach §§ 521 ff. BGB analog (Schenkungsrecht).
      </p>

      <h2>§ 9 Verfügbarkeit</h2>
      <p>
        Der Anbieter ist um eine möglichst hohe Verfügbarkeit bemüht,
        garantiert jedoch keine bestimmte Verfügbarkeit. Wartungsfenster und
        unvorhergesehene Ausfälle sind möglich.
      </p>

      <h2>§ 10 Kündigung</h2>
      <p>
        Der Nutzer kann seinen Account jederzeit ohne Frist über die
        Einstellungen löschen. Der Anbieter kann den Vertrag bei Verstößen
        gegen diese AGB außerordentlich kündigen, im Übrigen mit einer Frist
        von 14 Tagen.
      </p>

      <h2>§ 11 Datenschutz</h2>
      <p>
        Informationen zur Verarbeitung personenbezogener Daten findest du in
        unserer <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>

      <h2>§ 12 Änderungen der AGB</h2>
      <p>
        Der Anbieter kann diese AGB anpassen, soweit dies aus wichtigem Grund
        erforderlich ist. Wesentliche Änderungen werden dem Nutzer mindestens
        30 Tage vor Wirksamwerden per E-Mail angekündigt. Widerspricht der
        Nutzer nicht, gelten die Änderungen als angenommen.
      </p>

      <h2>§ 13 Schlussbestimmungen</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
        UN-Kaufrechts. Sollten einzelne Bestimmungen unwirksam sein, bleibt
        die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>
    </>
  );
}
