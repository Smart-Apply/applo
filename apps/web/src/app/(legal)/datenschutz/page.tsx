import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – Smart Apply",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
  robots: { index: true, follow: false },
};

/**
 * Privacy Policy (DSGVO Art. 13 / 14).
 *
 * IMPORTANT:
 *   1. Verify the list of sub-processors below matches what you actually
 *      use in production. If you disable a service, remove its section.
 *   2. Have the final text reviewed by a lawyer or use a generator
 *      such as e-recht24.de or datenschutz-generator.de for legal certainty.
 */
export default function DatenschutzPage() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>

      <p>
        <em>
          Stand: {new Date().toLocaleDateString("de-DE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </em>
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
        E-Mail:{" "}
        <a href="mailto:support@smart-apply.io">support@smart-apply.io</a>
      </p>

      <h2>2. Allgemeine Hinweise</h2>
      <p>
        Diese Datenschutzerklärung klärt dich über die Art, den Umfang und
        Zweck der Verarbeitung personenbezogener Daten innerhalb unseres
        Online-Angebotes &bdquo;Smart Apply&rdquo; auf. Personenbezogene Daten
        sind alle Daten, die sich auf dich persönlich beziehen lassen.
      </p>

      <h2>3. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>
          <strong>Account-Daten:</strong> E-Mail-Adresse, Vor- und Nachname,
          Passwort-Hash (Argon2), Sprachpräferenz, Zwei-Faktor-Geheimnisse
          (verschlüsselt).
        </li>
        <li>
          <strong>Profildaten:</strong> Lebenslauf-Informationen wie
          Berufserfahrung, Ausbildung, Skills, Sprachen, Projekte,
          Zertifikate, Anschrift.
        </li>
        <li>
          <strong>Inhalte:</strong> Stellenanzeigen, generierte Anschreiben
          und Lebensläufe sowie hochgeladene Dateien (PDF / DOCX).
        </li>
        <li>
          <strong>Sicherheits- und Audit-Daten:</strong> IP-Adresse, User
          Agent, Login-Zeitpunkte, Sessions und Geräte (max. 5 aktive Sessions
          pro Account).
        </li>
        <li>
          <strong>Nutzungs-Telemetrie:</strong> Aggregierte Zähler über
          generierte Bewerbungen zur Durchsetzung der Limits des kostenlosen
          Angebots.
        </li>
      </ul>

      <h2>4. Rechtsgrundlagen</h2>
      <ul>
        <li>
          Art. 6 Abs. 1 lit. b DSGVO – Verarbeitung zur Erfüllung des
          Nutzungsvertrags (Account, Generierung von Bewerbungsunterlagen).
        </li>
        <li>
          Art. 6 Abs. 1 lit. c DSGVO – Erfüllung rechtlicher Pflichten (z.&nbsp;B.
          Aufbewahrung von Audit-Logs).
        </li>
        <li>
          Art. 6 Abs. 1 lit. f DSGVO – Berechtigtes Interesse an
          Missbrauchsprävention, Sicherheit und Betriebsstabilität.
        </li>
        <li>
          Art. 6 Abs. 1 lit. a DSGVO – Einwilligung, soweit du diese erteilst
          (z.&nbsp;B. optionale E-Mail-Benachrichtigungen).
        </li>
      </ul>

      <h2>5. Empfänger / Auftragsverarbeiter</h2>
      <p>
        Zur Bereitstellung des Dienstes setzen wir folgende externe
        Dienstleister ein. Mit allen Anbietern bestehen Verträge über
        Auftragsverarbeitung gemäß Art. 28 DSGVO bzw. die Übermittlung erfolgt
        auf Grundlage von EU-Standardvertragsklauseln.
      </p>
      <ul>
        <li>
          <strong>Microsoft Azure</strong> (Microsoft Ireland Operations Ltd.,
          Region Sweden Central / EU): Hosting der Datenbank
          (Azure Database for PostgreSQL) und der Anwendungsserver.
        </li>
        <li>
          <strong>Cloudflare R2</strong> (Cloudflare Inc., USA &ndash;
          Datenspeicherung in der EU-Jurisdiktion): Datei-Speicherung der
          generierten Anschreiben, Lebensläufe und hochgeladenen Dokumente.
          Die Speicherung erfolgt ausschließlich in EU-Rechenzentren von
          Cloudflare; ein Verlassen der EU-Jurisdiktion ist vertraglich und
          technisch ausgeschlossen.
        </li>
        <li>
          <strong>Upstash</strong> (Upstash Inc., USA &ndash; Region EU):
          Verteiltes Rate-Limiting (Schutz vor Brute-Force- und
          Missbrauchsversuchen). Verarbeitet werden lediglich Zähler je
          IP-Adresse bzw. Nutzerkennung mit kurzer Aufbewahrungsdauer
          (max. 1&nbsp;Stunde).
        </li>
        <li>
          <strong>Azure OpenAI Service</strong> (Microsoft, EU/US): Generierung
          der personalisierten Anschreiben und Lebensläufe. Wir verwenden den
          Enterprise-Modus ohne Trainingsdatennutzung. Übermittelte Daten:
          Profilinhalte und Stellenanzeige des aktiven Vorgangs.
        </li>
        <li>
          <strong>Resend</strong> (Resend Inc., USA): Versand transaktionaler
          E-Mails (z.&nbsp;B. Passwort zurücksetzen, E-Mail-Bestätigung).
        </li>
        <li>
          <strong>Cloudflare</strong> (Cloudflare Inc., USA): DNS, CDN und
          DDoS-Schutz; verarbeitet zwangsläufig IP-Adressen und Request-Header.
        </li>
        <li>
          <strong>Sentry</strong> (Functional Software Inc., USA):
          Server-seitiges Fehler-Monitoring; übermittelt anonymisierte
          Stack-Traces. Wir filtern personenbezogene Daten (E-Mails, Namen,
          Tokens) vor dem Versand. Im Browser ist Sentry nicht aktiv.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong>: Bot-Schutz bei Registrierung
          und Login (datenschutzfreundliche CAPTCHA-Alternative).
        </li>
      </ul>

      <h2>6. Speicherdauer</h2>
      <ul>
        <li>Account-Daten: bis zur Löschung des Accounts durch dich.</li>
        <li>
          Soft-Delete: Nach Account-Löschung bleiben Daten 30 Tage
          wiederherstellbar, bevor sie endgültig entfernt werden.
        </li>
        <li>Audit-Logs: 90 Tage.</li>
        <li>
          Generierte Anschreiben und Lebensläufe sowie hochgeladene Dateien:
          bis zu deren manueller Löschung durch dich.
        </li>
      </ul>

      <h2>7. Deine Rechte</h2>
      <p>Du hast jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über deine bei uns gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>
          Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO), z.&nbsp;B. dem
          Bundesbeauftragten für den Datenschutz und die Informationsfreiheit.
        </li>
      </ul>
      <p>
        Du kannst deine Daten jederzeit selbst exportieren oder deinen
        gesamten Account inklusive aller Inhalte direkt in den{" "}
        <a href="/settings">Einstellungen</a> löschen.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Wir verwenden ausschließlich technisch notwendige Cookies (z.&nbsp;B.
        ein HttpOnly-Authentifizierungs-Cookie zur Aufrechterhaltung deiner
        Sitzung sowie ggf. ein CSRF-Schutz-Cookie). Eine Einwilligung ist
        hierfür nach § 25 Abs. 2 Nr. 2 TTDSG nicht erforderlich. Wir setzen
        keine Tracking- oder Werbe-Cookies.
      </p>

      <h2>9. Sicherheit</h2>
      <p>
        Wir setzen technische und organisatorische Maßnahmen ein, um deine
        Daten zu schützen, insbesondere: HTTPS-Transportverschlüsselung,
        Argon2-Passwort-Hashing, AES-256-Verschlüsselung der
        2FA-Geheimnisse, HttpOnly-Cookies, restriktive CORS- und CSP-Header,
        Rate-Limiting, regelmäßige Security-Audits.
      </p>

      <h2>10. Änderungen dieser Datenschutzerklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie
        stets den aktuellen rechtlichen Anforderungen entspricht oder um
        Änderungen unserer Leistungen abzubilden. Die jeweils aktuelle Version
        gilt ab Veröffentlichung auf dieser Seite.
      </p>
    </>
  );
}
