# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 Abs. 1 DSGVO)

> Stand: 16. August 2026 · Verantwortlicher siehe
> [Impressum](../../apps/web/src/app/\(legal\)/impressum/page.tsx) und §1 der
> [Datenschutzerklärung](../../apps/web/src/app/\(legal\)/datenschutz/page.tsx).
>
> Dieses Verzeichnis beschreibt **die Verarbeitungen, die der Code tatsächlich
> ausführt**. Empfänger stehen abschließend in
> [SUBPROCESSORS.md](./SUBPROCESSORS.md) (technisch überwacht durch
> `pnpm --filter @applo/api run check:subprocessors`), Fristen abschließend in
> [DELETION_CONCEPT.md](./DELETION_CONCEPT.md). Beide Dateien sind hier
> referenziert statt kopiert — eine dritte handgepflegte Kopie derselben Liste
> driftet garantiert.

## 1. Verantwortlicher und Kontakt

| Feld | Angabe |
|---|---|
| Verantwortlicher | Arianit Sheholli, c/o IP-Management #9916, Ludwig-Erhard-Straße 18, 20459 Hamburg |
| Kontakt Datenschutz | support@applo.ai |
| Datenschutzbeauftragter | Nicht bestellt. Die Bestellpflicht nach § 38 BDSG greift nicht (weniger als 20 Personen ständig mit automatisierter Verarbeitung befasst). Die Pflicht nach Art. 37(1)(b) DSGVO ist geprüft — siehe [DPIA_PRESCREENING.md](./DPIA_PRESCREENING.md) §4 |
| Aufsichtsbehörde | Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit |

## 2. Kategorien betroffener Personen

- **Registrierte Nutzerinnen und Nutzer** der Plattform (Bewerberinnen und
  Bewerber).
- **Dritte in nutzergenerierten Inhalten**: Ansprechpersonen aus
  Stellenanzeigen (Name, Funktion, teils Kontaktdaten), Absenderinnen und
  Absender von E-Mails im verbundenen Postfach (nur bei aktiviertem
  E-Mail-Tracking), in Lebensläufen genannte Referenzen.
- **Anfragende über das Kontaktformular** ohne Konto.

## 3. Verarbeitungstätigkeiten

Die Spalte „Code“ nennt das Modul unter `apps/api/src/`, damit eine Änderung
am Code sichtbar macht, welcher Eintrag anzupassen ist.

### V1 — Konto und Authentifizierung

| Feld | Angabe |
|---|---|
| Zweck | Registrierung, Anmeldung (Passwort, OAuth, 2FA), Sitzungs- und Geräteverwaltung, Passwort-Zurücksetzen, E-Mail-Bestätigung |
| Rechtsgrundlage | Art. 6(1)(b); Sicherheitsmaßnahmen Art. 6(1)(f) |
| Datenkategorien | E-Mail, Vor-/Nachname, Passwort-Hash (Argon2id), OAuth-Kennung, TOTP-Geheimnis (AES-256-GCM), Sitzungen, Refresh-Token, IP, User-Agent |
| Empfänger | Neon, Fly.io, Cloudflare, Microsoft Entra / Google (nur bei OAuth), Resend (Transaktionsmails) |
| Frist | Konto: bis zur Löschung (sofort). Sitzungen/Token: max. 30 Tage |
| Code | `auth`, `common/audit-logger` |

### V2 — Profil und Lebenslauf

| Feld | Angabe |
|---|---|
| Zweck | Pflege des Bewerbungsprofils; Übernahme von Daten aus einem hochgeladenen Lebenslauf (PDF/DOCX); optionales Bewerbungsfoto |
| Rechtsgrundlage | Art. 6(1)(b); für besondere Kategorien zusätzlich Art. 9(2)(a) (freiwillige Eingabe, siehe [DPIA_PRESCREENING.md](./DPIA_PRESCREENING.md)) |
| Datenkategorien | Berufserfahrung, Ausbildung, Skills, Sprachen, Projekte, Zertifikate, Anschrift, Zusammenfassung, Bewerbungsfoto |
| Empfänger | Neon, Cloudflare R2 (Datei + Foto), Azure OpenAI (Textinhalte bei der Übernahme aus dem Lebenslauf) |
| Frist | Bis zur Löschung durch die Nutzerin; verwaiste Uploads 7 Tage |
| Code | `profile`, `resume-parser`, `uploads`, `storage` |

### V3 — Erstellung von Bewerbungsunterlagen (KI)

| Feld | Angabe |
|---|---|
| Zweck | Erzeugen von Anschreiben und Lebenslauf, abgestimmt auf eine Stellenanzeige; ATS-Keyword-Analyse; Übersetzung beim Export; PDF-Erzeugung |
| Rechtsgrundlage | Art. 6(1)(b) |
| Datenkategorien | **Vollständige Profilinhalte**, Stellenanzeigentext inkl. Ansprechperson, erzeugte Dokumente, Zwischenergebnisse |
| Empfänger | Azure OpenAI (West Europe), Azure AI Foundry, optional Mistral AI (nur mechanische Extraktionsschritte), Upstash QStash (nur Auftrags-IDs), Cloudflare R2 (PDFs), Neon |
| Frist | Bis zur Löschung; gelöschte Bewerbungen inkl. PDFs nach 30 Tagen |
| Besonderheit | Keine automatisierte Entscheidung i. S. v. Art. 22 — die Ergebnisse sind Entwürfe, die die Nutzerin prüft und verwendet |
| Code | `applications`, `job-postings`, `keywords`, `llm`, `pdf-v2`, `jobs`, `storage` |

### V4 — Bewerbungs-Check

| Feld | Angabe |
|---|---|
| Zweck | KI-Bewertung einer außerhalb von Applo erstellten Bewerbung (Qualität, ATS-Tauglichkeit) |
| Rechtsgrundlage | Art. 6(1)(b) |
| Datenkategorien | Von der Nutzerin eingefügter Lebenslauf- und Anschreibentext, optionaler Stellenkontext, erzeugtes Ergebnis |
| Empfänger | Azure OpenAI, Neon |
| Frist | Bis zur Löschung durch die Nutzerin |
| Code | `validation` |

### V5 — Interview-Coach (Text und Sprache)

| Feld | Angabe |
|---|---|
| Zweck | Simuliertes Vorstellungsgespräch mit Bewertung und Feedback; im Sprachmodus als Echtzeitgespräch |
| Rechtsgrundlage | Art. 6(1)(b) |
| Datenkategorien | Fragen, Antworten, Bewertungen, Transkript, Gesprächsdauer, Token-Telemetrie; Profilauszug als Grundlage der Fragen. **Keine Audioaufnahme** |
| Empfänger | Azure OpenAI Realtime (Sweden Central, Audiostream direkt vom Browser), Azure OpenAI (Bewertung), optional Mistral AI (Bewertungsschritte), Neon |
| Frist | Bis zur Löschung des Kontos |
| Code | `interviews`, `interviews/voice` |

### V6 — E-Mail-Tracking (optional, Premium)

| Feld | Angabe |
|---|---|
| Zweck | Automatische Statusaktualisierung einer Bewerbung anhand von Antworten im Postfach der Nutzerin |
| Rechtsgrundlage | Art. 6(1)(a) — Einwilligung durch bewusstes Verbinden des Postfachs nach Consent-Dialog; jederzeit widerrufbar |
| Datenkategorien | Verschlüsseltes OAuth-Refresh-Token, Absender, Absendername, Betreff, Klassifikation. Vom Nachrichtentext werden max. 1.200 Zeichen übermittelt, aber **nicht gespeichert** |
| Datenminimierung | Ein lokaler Matcher läuft **vor** der KI-Klassifikation. Nicht zuordenbare Nachrichten werden weder übermittelt noch gespeichert |
| Empfänger | Microsoft Graph, Azure OpenAI, Neon |
| Frist | Ereignisse 180 Tage; Verbindung und Token sofort beim Trennen |
| Code | `mailbox-sync` |

### V7 — Abonnement und Nutzungsgrenzen

| Feld | Angabe |
|---|---|
| Zweck | Durchsetzung der Tarifgrenzen (Bewerbungen, Checks, Interviews, Sprachminuten) und Verwaltung von Zusatzguthaben |
| Rechtsgrundlage | Art. 6(1)(b) |
| Datenkategorien | Tarif, Abrechnungszeitraum, Zähler je Funktion |
| Empfänger | Neon |
| Frist | Bis zur Löschung des Kontos |
| Code | `subscription`, `admin` |

### V8 — Sicherheit, Missbrauchsprävention und Betrieb

| Feld | Angabe |
|---|---|
| Zweck | Rate-Limiting, Bot-Schutz, Sicherheitsprotokollierung, Fehler-Monitoring, Betriebsstabilität |
| Rechtsgrundlage | Art. 6(1)(f) |
| Datenkategorien | IP-Adresse, User-Agent, Sicherheitsereignisse (Anmeldung, Passwortänderung, Kontolöschung) mit E-Mail-Adresse, Stack-Traces, Turnstile-Token |
| Empfänger | Upstash Redis, Cloudflare (Turnstile, CDN), Sentry, Fly.io |
| Frist | Logdateien 90 Tage (Rotation); Rate-Limit-Zähler Minuten bis Stunden |
| Code | `common/guards`, `common/audit-logger`, `logger`, `main.ts` |

### V9 — Pseudonyme KI-Nutzungsstatistik

| Feld | Angabe |
|---|---|
| Zweck | Kosten- und Qualitätssteuerung der KI-Nutzung je Funktion |
| Rechtsgrundlage | Art. 6(1)(f); Widerspruch über den Schalter „Nutzungsdaten“ in den Einstellungen wirkt sofort und unterdrückt die Zeile |
| Datenkategorien | Gesalzener `actorHash` statt Nutzer-ID, Funktion, Modell, Lane, Tokenzahl, Sprache, Zeitpunkt. **Keine Prompt- oder Antwortinhalte** |
| Einordnung | Pseudonym, nicht anonym: der Zeitstempel korreliert mit `applications`/`validations`. Deshalb Löschung bei Kontolöschung und Retention-Sweep |
| Empfänger | Neon |
| Frist | 90 Tage; sofort bei Kontolöschung |
| Code | `llm/usage` |

### V10 — Transaktionale E-Mails und Support

| Feld | Angabe |
|---|---|
| Zweck | Bestätigungs-, Sicherheits- und Benachrichtigungs-E-Mails; Beantwortung von Anfragen über das Kontaktformular |
| Rechtsgrundlage | Art. 6(1)(b) und (f); optionale Benachrichtigungen Art. 6(1)(a) |
| Datenkategorien | E-Mail-Adresse, Name, Inhalt der Nachricht |
| Empfänger | Resend, Neon |
| Frist | Bis zur Löschung des Kontos bzw. bis zur Erledigung der Anfrage |
| Code | `email`, `contact` |

### V11 — Betroffenenrechte

| Feld | Angabe |
|---|---|
| Zweck | Auskunft und Datenübertragbarkeit (Selbstbedienung als JSON-Export inkl. Art.-15(1)(c)–(h)-Angaben), Löschung des Kontos, Support-Löschung durch Administratoren |
| Rechtsgrundlage | Art. 6(1)(c) i. V. m. Art. 15, 17, 20 DSGVO |
| Datenkategorien | Sämtliche zum Konto gespeicherten Daten |
| Empfänger | Keine über die ohnehin beteiligten Auftragsverarbeiter hinaus |
| Frist | Der Export wird nicht serverseitig gespeichert |
| Code | `auth` (`exportUserData`, `deleteAccount`), `common/erasure`, `admin` |

## 4. Drittlandübermittlung

Fly.io, Cloudflare, Upstash, Resend, Sentry und Neon sind US-Gesellschaften;
die eingesetzte Infrastruktur liegt jeweils in der EU. Grundlage der
Übermittlung sind EU-Standardvertragsklauseln bzw. das EU-US Data Privacy
Framework. **Offener Punkt:** AVV und SCC für Fly.io und Neon sind zu prüfen
und abzuschließen (siehe [SUBPROCESSORS.md](./SUBPROCESSORS.md) §„Offene
Punkte“).

## 5. Technische und organisatorische Maßnahmen

Beschrieben in [TOM.md](./TOM.md) (Art. 32 DSGVO).
