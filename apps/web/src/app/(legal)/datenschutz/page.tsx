import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – Applo",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
  robots: { index: true, follow: false },
};

/**
 * Privacy Policy (DSGVO Art. 13 / 14).
 *
 * §6 (Empfänger) mirrors `docs/security/SUBPROCESSORS.md` — that file is the
 * source of truth and `pnpm --filter @applo/api run check:subprocessors`
 * (CI job `lint-and-typecheck`) fails when a credential env var for a new
 * service is added without a row there. Whoever edits the list edits this
 * page in the same PR; the retention table in §9 mirrors
 * `docs/security/DELETION_CONCEPT.md`.
 *
 * Why the coupling exists: this page used to be a hand-maintained document
 * with no link to the code, and it drifted far enough to describe an
 * architecture that never existed (Azure App Server + Azure Database for
 * PostgreSQL) while omitting three recipients personal data is actually sent
 * to, plus two whole features (issue #806). Nothing held the copies together.
 *
 * Have the final text reviewed by a lawyer before relying on it.
 */

/**
 * Fixed, hand-maintained date. Deliberately not `new Date()`: a policy that
 * claims to have been updated today, every day, cannot be versioned — and a
 * data subject cannot tell whether the text changed since they read it.
 */
const LAST_UPDATED = "16. August 2026";

export default function DatenschutzPage() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>

      <p>
        <em>Stand: {LAST_UPDATED}</em>
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:
        <br />
        Arianit Sheholli
        <br />
        c/o IP-Management #9916
        <br />
        Ludwig-Erhard-Straße 18
        <br />
        20459 Hamburg
        <br />
        Deutschland
        <br />
        E-Mail: <a href="mailto:support@applo.ai">support@applo.ai</a>
      </p>

      <h2>2. Allgemeine Hinweise</h2>
      <p>
        Diese Datenschutzerklärung klärt dich über die Art, den Umfang und
        Zweck der Verarbeitung personenbezogener Daten innerhalb unseres
        Online-Angebotes &bdquo;Applo&rdquo; auf. Personenbezogene Daten sind
        alle Daten, die sich auf dich persönlich beziehen lassen.
      </p>
      <p>
        Applo erstellt Bewerbungsunterlagen mit Hilfe von KI-Sprachmodellen.
        Das bedeutet: <strong>Die Inhalte deines Lebenslaufs und der von dir
        eingefügten Stellenanzeigen werden im Volltext an einen externen
        KI-Anbieter übermittelt.</strong> Welche Anbieter das sind, steht in
        Abschnitt 6; was genau übermittelt wird, in Abschnitt 7.
      </p>

      <h2>3. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>
          <strong>Account-Daten:</strong> E-Mail-Adresse, Vor- und Nachname,
          Passwort-Hash (Argon2), Sprachpräferenz, Zwei-Faktor-Geheimnisse
          (verschlüsselt gespeichert). Bei Anmeldung über Google oder Microsoft
          zusätzlich die vom Anbieter übermittelte Kennung.
        </li>
        <li>
          <strong>Profildaten:</strong> Lebenslauf-Informationen wie
          Berufserfahrung, Ausbildung, Skills, Sprachen, Projekte, Zertifikate,
          Anschrift sowie ein optionales Bewerbungsfoto.
        </li>
        <li>
          <strong>Inhalte:</strong> Stellenanzeigen, generierte Anschreiben und
          Lebensläufe, Bewerbungs-Checks, hochgeladene Dateien (PDF / DOCX)
          sowie selbst angelegte Termine im Bewerbungskalender.
        </li>
        <li>
          <strong>Interview-Coach:</strong> Fragen, deine Antworten, Bewertungen
          und Feedback; im Sprachmodus zusätzlich das Transkript des Gesprächs
          und dessen Dauer. Audioaufnahmen speichern wir nicht (Abschnitt 8).
        </li>
        <li>
          <strong>E-Mail-Tracking (optional, nur Premium):</strong> Absender,
          Absendername und Betreff der Nachrichten, die einer deiner
          Bewerbungen zugeordnet werden konnten, sowie das erkannte Ergebnis
          (z.&nbsp;B. &bdquo;Einladung&rdquo;, &bdquo;Absage&rdquo;). Details in
          Abschnitt 8.
        </li>
        <li>
          <strong>Sicherheits- und Sitzungsdaten:</strong> IP-Adresse, User
          Agent, Login-Zeitpunkte, aktive Sitzungen und Geräte (max. 5 aktive
          Sitzungen pro Account), Sicherheitsereignisse in Server-Logdateien.
        </li>
        <li>
          <strong>Nutzungs- und Verbrauchsdaten:</strong> Zähler über generierte
          Bewerbungen, Bewerbungs-Checks und Interviews zur Durchsetzung der
          Tarifgrenzen sowie eine pseudonyme KI-Nutzungsstatistik (Modell,
          Funktion, Tokenzahl, Zeitpunkt — ohne Prompt- oder Antwortinhalte).
          Diese Statistik ist pseudonym, nicht anonym, und damit
          personenbezogen; du kannst sie in den{" "}
          <Link href="/settings">Einstellungen</Link> abschalten.
        </li>
      </ul>

      <h2>4. Rechtsgrundlagen</h2>
      <ul>
        <li>
          <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – Erfüllung des
          Nutzungsvertrags: Account, Profil, Generierung von
          Bewerbungsunterlagen, Bewerbungs-Check, Interview-Coach, Speicherung
          deiner Dokumente.
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> – Berechtigtes Interesse
          an Missbrauchsprävention, Sicherheit und Betriebsstabilität:
          Sicherheits-Logdateien, Rate-Limiting, Bot-Schutz, Fehler-Monitoring,
          KI-Nutzungsstatistik zur Kosten- und Qualitätssteuerung.
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> – Einwilligung, soweit du
          sie erteilst: E-Mail-Tracking (Postfachzugriff), optionale
          Benachrichtigungen. Eine erteilte Einwilligung kannst du jederzeit mit
          Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO) – beim
          E-Mail-Tracking durch Trennen der Postfachverbindung in den
          Einstellungen, bei der KI-Nutzungsstatistik über den entsprechenden
          Schalter.
        </li>
        <li>
          <strong>Art. 9 Abs. 2 lit. a DSGVO</strong> – ausdrückliche
          Einwilligung, soweit du besondere Kategorien personenbezogener Daten
          in dein Profil einträgst (Abschnitt 5).
        </li>
      </ul>

      <h2>5. Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO)</h2>
      <p>
        Bewerbungsunterlagen enthalten häufig Angaben, die Art. 9 DSGVO
        besonders schützt: eine Schwerbehinderung, ein kirchlicher Arbeitgeber
        oder ein Ehrenamt (Rückschluss auf Religion oder politische
        Überzeugung), eine Gewerkschaftsmitgliedschaft, eine
        Gesundheitsangabe zur Erklärung einer Lücke im Lebenslauf. Ein
        Bewerbungsfoto lässt zudem Rückschlüsse auf ethnische Herkunft zu.
      </p>
      <p>
        <strong>
          Diese Angaben werden wie alle anderen Profilinhalte im Volltext an den
          KI-Anbieter übermittelt, verarbeitet und in den erzeugten Dokumenten
          gespeichert.
        </strong>{" "}
        Wir filtern sie nicht heraus – technisch ist ein solcher Filter nicht
        zuverlässig möglich, und er würde deinen Lebenslauf verfälschen.
      </p>
      <p>
        Indem du solche Angaben freiwillig in dein Profil einträgst oder einen
        Lebenslauf mit solchen Angaben hochlädst, willigst du ausdrücklich in
        ihre Verarbeitung zu diesem Zweck ein (Art. 9 Abs. 2 lit. a DSGVO). Du
        bist dazu nicht verpflichtet: Applo funktioniert vollständig ohne
        Bewerbungsfoto und ohne Angaben dieser Art. Du kannst sie jederzeit im
        Profil löschen; die Einwilligung wirkt dann nicht mehr für die Zukunft.
      </p>

      <h2>6. Empfänger / Auftragsverarbeiter</h2>
      <p>
        Zur Bereitstellung des Dienstes setzen wir die folgenden externen
        Dienstleister ein. Soweit dabei Daten in ein Drittland übermittelt
        werden, geschieht dies auf Grundlage von EU-Standardvertragsklauseln
        bzw. des EU-US Data Privacy Framework. Diese Liste wird technisch
        überwacht: Ein neuer Dienst kann im Quellcode nicht hinzugefügt werden,
        ohne dass er hier aufgeführt ist.
      </p>
      <table>
        <thead>
          <tr>
            <th>Dienst</th>
            <th>Anbieter / Sitz</th>
            <th>Zweck und übermittelte Daten</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fly.io</td>
            <td>Fly.io Inc., USA – Server in Frankfurt</td>
            <td>
              Betrieb der Anwendungsserver (API). Verarbeitet werden alle
              serverseitig verarbeiteten Daten.
            </td>
          </tr>
          <tr>
            <td>Neon</td>
            <td>Neon Inc., USA – Datenbank in der EU (Frankfurt)</td>
            <td>
              Primärdatenbank: Account, Profil, Bewerbungen, Stellenanzeigen,
              Sitzungen.
            </td>
          </tr>
          <tr>
            <td>Cloudflare Workers</td>
            <td>Cloudflare Inc., USA</td>
            <td>
              Betrieb der Weboberfläche. Request-Metadaten, Authentifizierungs-Cookies.
            </td>
          </tr>
          <tr>
            <td>Cloudflare R2</td>
            <td>Cloudflare Inc., USA – Bucket in EU-Jurisdiktion</td>
            <td>
              Dateispeicher: generierte Anschreiben und Lebensläufe,
              hochgeladene Dokumente, Bewerbungsfoto.
            </td>
          </tr>
          <tr>
            <td>Cloudflare DNS / CDN / Turnstile</td>
            <td>Cloudflare Inc., USA</td>
            <td>
              DNS, CDN, DDoS-Schutz sowie Bot-Schutz bei Registrierung und
              Login. IP-Adresse, Request-Header, Turnstile-Token.
            </td>
          </tr>
          <tr>
            <td>Microsoft Azure OpenAI</td>
            <td>
              Microsoft Ireland Operations Ltd. – Region West Europe (Text),
              Sweden Central (Sprache)
            </td>
            <td>
              Erzeugung von Anschreiben und Lebensläufen, Bewerbungs-Check,
              Interview-Coach inklusive Sprachmodus.{" "}
              <strong>Vollständige Profil- und Lebenslaufinhalte</strong>,
              Stellenanzeigen, Anschreiben; im Sprachmodus der Audiostream des
              Interviews; beim E-Mail-Tracking Absender, Betreff und ein
              Textauszug. Verarbeitung im Enterprise-Modus ohne Nutzung zum
              Modelltraining.
            </td>
          </tr>
          <tr>
            <td>Azure AI Foundry</td>
            <td>Microsoft Ireland Operations Ltd., EU</td>
            <td>
              Agentengestützte Auswertung von Stellenanzeigen (ATS-Keywords,
              URL-Parsing). Stellenanzeigen- und Profilinhalte.
            </td>
          </tr>
          <tr>
            <td>Mistral AI</td>
            <td>Mistral AI SAS, Frankreich</td>
            <td>
              Optionale schnelle Verarbeitungsspur für mechanische
              Auswertungsschritte (ATS-Keywords, Eckdaten der Stellenanzeige,
              Skill-Auswahl, Interview-Bewertung). Stellenanzeigen-Inhalte,
              Profil-Skills, Interview-Antworten.
            </td>
          </tr>
          <tr>
            <td>Microsoft Graph</td>
            <td>Microsoft Ireland Operations Ltd., EU</td>
            <td>
              Nur bei aktiviertem E-Mail-Tracking: Lesezugriff auf das von dir
              verbundene Postfach. Verschlüsselt gespeichertes
              OAuth-Refresh-Token, Metadaten und Textauszüge der abgerufenen
              Nachrichten (Abschnitt 8).
            </td>
          </tr>
          <tr>
            <td>Microsoft Entra / Google OAuth</td>
            <td>
              Microsoft Ireland Operations Ltd. / Google Ireland Ltd.
            </td>
            <td>
              Nur bei Anmeldung über &bdquo;Sign in with …&ldquo;: Name,
              E-Mail-Adresse und Profilbild-URL vom jeweiligen Anbieter.
            </td>
          </tr>
          <tr>
            <td>Upstash Redis</td>
            <td>Upstash Inc., USA – Region EU</td>
            <td>
              Verteiltes Rate-Limiting. Zähler je Nutzerkennung bzw. IP-Adresse
              mit kurzer Aufbewahrungsdauer.
            </td>
          </tr>
          <tr>
            <td>Upstash QStash</td>
            <td>Upstash Inc., USA – Region EU</td>
            <td>
              Auftragswarteschlange der Generierungs-Pipeline. Übermittelt
              werden Auftrags-Kennungen, keine Profilinhalte.
            </td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Resend Inc., USA</td>
            <td>
              Versand transaktionaler E-Mails (Bestätigung, Passwort
              zurücksetzen, Benachrichtigungen). E-Mail-Adresse, Name, Inhalt
              der Nachricht.
            </td>
          </tr>
          <tr>
            <td>Sentry</td>
            <td>Functional Software Inc., USA</td>
            <td>
              Fehler-Monitoring, <strong>server- und browserseitig</strong>.
              Stack-Traces und Request-Metadaten; im Browser zusätzlich eine
              10-%-Stichprobe von Performance-Messungen. Session Replay ist
              abgeschaltet, die automatische Erfassung personenbezogener Felder
              (E-Mail, IP, Cookies) ist deaktiviert, und personenbezogene Felder
              werden serverseitig vor dem Versand gefiltert.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>7. KI-gestützte Verarbeitung</h2>
      <p>
        Beim Erstellen einer Bewerbung übermitteln wir an den konfigurierten
        KI-Anbieter: deine Profilinhalte (Berufserfahrung, Ausbildung, Skills,
        Projekte, Zertifikate, Sprachen, Zusammenfassung), den Text der
        Stellenanzeige sowie Zwischenergebnisse der Generierung. Beim
        Bewerbungs-Check übermitteln wir die von dir eingefügten Unterlagen. Das
        Bewerbungsfoto wird nicht an das Sprachmodell übermittelt; es wird erst
        beim Erzeugen der PDF-Datei auf unserem Server eingefügt.
      </p>
      <p>
        <strong>Keine automatisierte Entscheidung im Einzelfall:</strong> Die
        Ergebnisse (Anschreiben, Lebenslauf, Score, Interview-Feedback) sind
        Vorschläge, die du prüfst, änderst und selbst verwendest. Eine
        Entscheidung mit rechtlicher Wirkung oder ähnlich erheblicher
        Beeinträchtigung im Sinne von Art. 22 DSGVO trifft Applo nicht – über
        deine Bewerbung entscheidet allein das Unternehmen, bei dem du dich
        bewirbst.
      </p>

      <h2>8. Optionale Funktionen mit erweiterter Verarbeitung</h2>

      <h3>E-Mail-Tracking (Premium)</h3>
      <p>
        Wenn du dein Postfach verbindest, erteilst du Microsoft Graph einen
        Lesezugriff (Berechtigung <code>Mail.Read</code>), der technisch dein
        gesamtes Postfach umfasst. Wir setzen darauf mehrere Begrenzungen:
      </p>
      <ul>
        <li>
          Von jeder gemeldeten Nachricht rufen wir nur einen Auszug von maximal
          1.200 Zeichen ab.
        </li>
        <li>
          Vor jeder KI-Auswertung läuft eine lokale Zuordnung auf unserem
          Server. Nachrichten, die keiner deiner Bewerbungen zugeordnet werden
          können, werden <strong>weder an den KI-Anbieter übermittelt noch
          gespeichert</strong>.
        </li>
        <li>
          Nur für zugeordnete Nachrichten werden Absender, Absendername,
          Betreff und der Textauszug zur Einordnung („Eingangsbestätigung“,
          „Einladung“, „Absage“) an den KI-Anbieter übermittelt.
        </li>
        <li>
          Gespeichert werden Absender, Absendername, Betreff und das Ergebnis –
          niemals der Nachrichtentext. Nachrichten ohne verwertbares Signal
          werden gar nicht gespeichert.
        </li>
      </ul>
      <p>
        Du kannst die Verbindung jederzeit in den{" "}
        <Link href="/settings">Einstellungen</Link> trennen; das dort gespeicherte
        Zugriffstoken wird dabei gelöscht und das Abonnement bei Microsoft
        widerrufen.
      </p>

      <h3>Interview-Coach (Pro und Premium)</h3>
      <p>
        Im Textmodus verarbeiten wir Fragen, deine Antworten und die daraus
        erzeugte Bewertung. Im Sprachmodus baut dein Browser eine direkte
        Verbindung zum Sprachmodell von Microsoft Azure OpenAI in Sweden
        Central auf – der Audiostream läuft nicht über unsere Server. Wir
        speichern <strong>keine Audioaufnahmen</strong>, sondern nur das
        Transkript des Gesprächs, die Dauer (für die monatliche
        Minutenbegrenzung) und die Bewertung. Grundlage der Fragen ist ein
        Auszug deines Profils.
      </p>

      <h2>9. Speicherdauer</h2>
      <table>
        <thead>
          <tr>
            <th>Daten</th>
            <th>Dauer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account, Profil, Dokumente</td>
            <td>
              Bis zur Löschung des Accounts durch dich. Die Löschung erfolgt{" "}
              <strong>sofort und endgültig</strong> – es gibt keinen Papierkorb
              und keine Wiederherstellungsfrist. Gelöscht werden dabei auch alle
              zugehörigen Dateien im Objektspeicher.
            </td>
          </tr>
          <tr>
            <td>Gelöschte Bewerbungen und Stellenanzeigen</td>
            <td>
              30 Tage wiederherstellbar, danach werden Datensatz und erzeugte
              PDF-Dateien endgültig entfernt.
            </td>
          </tr>
          <tr>
            <td>Hochgeladene Dateien ohne weitere Verwendung</td>
            <td>7 Tage.</td>
          </tr>
          <tr>
            <td>E-Mail-Tracking-Ereignisse</td>
            <td>180 Tage.</td>
          </tr>
          <tr>
            <td>KI-Nutzungsstatistik</td>
            <td>
              90 Tage; zusätzlich bei Kontolöschung sofort entfernt.
            </td>
          </tr>
          <tr>
            <td>Sicherheits-Logdateien</td>
            <td>
              90 Tage. Diese Dateien liegen außerhalb der Datenbank und
              enthalten E-Mail-Adresse, IP-Adresse und User Agent zu
              sicherheitsrelevanten Ereignissen (Anmeldung, Passwortänderung,
              Kontolöschung).
            </td>
          </tr>
          <tr>
            <td>Sitzungen und Refresh-Token</td>
            <td>
              Bis zum Abmelden, längstens 30 Tage; abgelaufene und widerrufene
              Einträge werden täglich entfernt.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>10. Deine Rechte</h2>
      <p>Du hast jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über deine bei uns gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
        <li>
          Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO), z.&nbsp;B. dem
          Hamburgischen Beauftragten für Datenschutz und Informationsfreiheit.
        </li>
      </ul>
      <p>
        Auskunft und Datenübertragbarkeit kannst du selbst auslösen: In den{" "}
        <Link href="/settings">Einstellungen</Link> erzeugst du eine vollständige
        Kopie aller zu dir gespeicherten Daten als maschinenlesbare Datei,
        einschließlich der nach Art. 15 Abs. 1 lit. c–h DSGVO erforderlichen
        Angaben. Ebenfalls dort löschst du deinen gesamten Account. Die
        Sicherheits-Logdateien liegen außerhalb der Datenbank und sind nicht
        Teil des Exports; eine Kopie stellen wir dir auf Anfrage an{" "}
        <a href="mailto:support@applo.ai">support@applo.ai</a> zur Verfügung.
      </p>

      <h2>11. Cookies und lokale Speicherung</h2>
      <p>
        Wir verwenden ausschließlich technisch notwendige Cookies: ein
        HttpOnly-Authentifizierungs-Cookie und ein Refresh-Token-Cookie zur
        Aufrechterhaltung deiner Sitzung, ggf. ein CSRF-Schutz-Cookie sowie ein
        Cookie für deine gewählte Sprache. Eine Einwilligung ist hierfür nach
        § 25 Abs. 2 Nr. 2 TDDDG nicht erforderlich. Wir setzen keine Tracking-
        oder Werbe-Cookies. Im lokalen Speicher deines Browsers legen wir
        technisch notwendige Werte ab (z.&nbsp;B. das CSRF-Token und die
        Bestätigung des Cookie-Hinweises).
      </p>

      <h2>12. Sicherheit</h2>
      <p>
        Wir setzen technische und organisatorische Maßnahmen ein, um deine Daten
        zu schützen, insbesondere: HTTPS-Transportverschlüsselung,
        Argon2-Passwort-Hashing, AES-256-GCM-Verschlüsselung der
        2FA-Geheimnisse und der Postfach-Zugriffstoken, HttpOnly-Cookies,
        Zwei-Faktor-Authentisierung, restriktive CORS- und CSP-Header,
        Rate-Limiting, Bot-Schutz sowie regelmäßige Security-Audits. Eine
        ausführliche Beschreibung findest du in unserer internen
        TOM-Dokumentation, die wir auf Anfrage zur Verfügung stellen.
      </p>

      <h2>13. Änderungen dieser Datenschutzerklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie
        stets den aktuellen rechtlichen Anforderungen entspricht oder um
        Änderungen unserer Leistungen abzubilden. Die jeweils aktuelle Version
        gilt ab Veröffentlichung auf dieser Seite.
      </p>
    </>
  );
}
