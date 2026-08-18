import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen – Applo",
  description: "Nutzungsbedingungen für die Applo Plattform.",
  robots: { index: true, follow: false },
};

/**
 * Terms of Service (AGB).
 *
 * § 8 (Preise und Zahlung) and § 9 (Widerrufsrecht) exist because paid tiers
 * are live. Two things there are load-bearing and must not be softened without
 * legal advice:
 *   - the § 356 Abs. 4 BGB waiver is what makes a purchase final; the matching
 *     checkbox lives on /pricing and the API refuses a checkout without it.
 *   - the VAT sentence must match PAYMENTS_SMALL_BUSINESS. A Kleinunternehmer
 *     may not state that VAT is included.
 *
 * Have the final text reviewed by a lawyer.
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
        die Nutzung der Plattform &bdquo;Applo&rdquo;, betrieben von
        Arianit Sheholli, c/o IP-Management #9916, Ludwig-Erhard-Straße 18,
        20459 Hamburg (&bdquo;Anbieter&rdquo;), durch registrierte Nutzerinnen
        und Nutzer (&bdquo;Nutzer&rdquo;).
      </p>

      <h2>§ 2 Leistungsbeschreibung</h2>
      <p>
        Applo ist eine Online-Plattform zur KI-gestützten Erstellung
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
        Für unentgeltlich genutzte Leistungen (Free-Tarif) haftet der Anbieter
        zudem nur nach §§ 521 ff. BGB analog (Schenkungsrecht).
      </p>

      <h2>§ 9 Preise, Zahlung und Laufzeit</h2>
      <p>
        Der Free-Tarif ist dauerhaft kostenlos. Die kostenpflichtigen Tarife
        Pro und Premium werden als monatliches Abonnement abgeschlossen; die
        jeweils geltenden Preise ergeben sich aus der{" "}
        <Link href="/pricing">Preisübersicht</Link>. Alle Preise sind
        Bruttopreise und verstehen sich einschließlich einer etwaigen
        gesetzlichen Umsatzsteuer.
      </p>
      <p>
        Die Zahlungsabwicklung erfolgt über Stripe Payments Europe Ltd. Der
        Vertrag kommt mit dem Abschluss des Bezahlvorgangs zustande. Das
        Abonnement verlängert sich automatisch um jeweils einen Monat, sofern
        es nicht vor Ablauf der laufenden Periode gekündigt wird; eine
        Kündigung ist jederzeit über die{" "}
        <Link href="/kuendigung">Kündigungsseite</Link> möglich und wird zum
        Ende der bereits bezahlten Laufzeit wirksam.
      </p>
      <p>
        Einmalig erworbene Extra-Credits sind nicht Teil des Abonnements. Sie
        verfallen nicht, werden erst nach dem monatlichen Kontingent verbraucht
        und bleiben auch nach einer Kündigung des Abonnements erhalten.
      </p>
      <p>
        Bleibt eine Zahlung aus, kann der Anbieter den Zugang zu den
        kostenpflichtigen Funktionen nach erfolgloser Zahlungswiederholung
        aussetzen. Der Zugang zum Free-Tarif bleibt davon unberührt.
      </p>

      <h2>§ 10 Widerrufsrecht für Verbraucher</h2>
      <p>
        <strong>Widerrufsbelehrung.</strong> Verbraucher haben das Recht,
        binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
        widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des
        Vertragsabschlusses. Um das Widerrufsrecht auszuüben, genügt eine
        eindeutige Erklärung (z. B. per E-Mail an{" "}
        <a href="mailto:support@applo.ai">support@applo.ai</a>) über den
        Entschluss, den Vertrag zu widerrufen. Zur Wahrung der Frist reicht es
        aus, dass die Erklärung vor Ablauf der Frist abgesendet wird.
      </p>
      <p>
        <strong>Folgen des Widerrufs.</strong> Im Falle eines wirksamen
        Widerrufs erstattet der Anbieter alle erhaltenen Zahlungen unverzüglich
        und spätestens binnen vierzehn Tagen ab Zugang der Widerrufserklärung,
        über dasselbe Zahlungsmittel, das beim ursprünglichen Vorgang
        eingesetzt wurde.
      </p>
      <p>
        <strong>Vorzeitiges Erlöschen des Widerrufsrechts.</strong> Applo
        erbringt eine digitale Dienstleistung, die unmittelbar nach
        Vertragsschluss zur Verfügung steht. Das Widerrufsrecht erlischt daher
        nach § 356 Abs. 4 BGB, wenn der Nutzer vor dem Kauf ausdrücklich
        zugestimmt hat, dass der Anbieter mit der Ausführung sofort beginnt,
        und zugleich bestätigt hat, dass er mit Beginn der Ausführung sein
        zustande. Diese Zustimmung wird im Bezahlvorgang gesondert eingeholt;
        ohne sie kommt kein kostenpflichtiger Vertrag zustande.
      </p>
      <p>
        <strong>Muster-Widerrufsformular.</strong> Hiermit widerrufe(n) ich/wir
        den von mir/uns abgeschlossenen Vertrag über die Erbringung der
        folgenden Dienstleistung: — Bestellt am / Name des Verbrauchers /
        Anschrift des Verbrauchers / Datum. Zu senden an: A. Sheholli, c/o
        IP-Management #9916, Ludwig-Erhard-Straße 18, 20459 Hamburg, oder per
        E-Mail an <a href="mailto:support@applo.ai">support@applo.ai</a>.
      </p>

      <h2>§ 11 Verfügbarkeit</h2>
      <p>
        Der Anbieter ist um eine möglichst hohe Verfügbarkeit bemüht,
        garantiert jedoch keine bestimmte Verfügbarkeit. Wartungsfenster und
        unvorhergesehene Ausfälle sind möglich.
      </p>

      <h2>§ 12 Kündigung</h2>
      <p>
        Der Nutzer kann seinen Account jederzeit ohne Frist über die
        Einstellungen löschen. Der Anbieter kann den Vertrag bei Verstößen
        gegen diese AGB außerordentlich kündigen, im Übrigen mit einer Frist
        von 14 Tagen.
      </p>

      <h2>§ 13 Datenschutz</h2>
      <p>
        Informationen zur Verarbeitung personenbezogener Daten findest du in
        unserer <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <h2>§ 14 Änderungen der AGB</h2>
      <p>
        Der Anbieter kann diese AGB anpassen, soweit dies aus wichtigem Grund
        erforderlich ist. Wesentliche Änderungen werden dem Nutzer mindestens
        30 Tage vor Wirksamwerden per E-Mail angekündigt. Widerspricht der
        Nutzer nicht, gelten die Änderungen als angenommen.
      </p>

      <h2>§ 15 Schlussbestimmungen</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
        UN-Kaufrechts. Sollten einzelne Bestimmungen unwirksam sein, bleibt
        die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>
    </>
  );
}
