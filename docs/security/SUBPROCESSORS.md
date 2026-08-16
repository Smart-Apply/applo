# Auftragsverarbeiter (Art. 28 DSGVO)

> **Diese Datei ist die Quelle der Wahrheit.** Die Datenschutzerklärung unter
> [`apps/web/src/app/(legal)/datenschutz/page.tsx`](../../apps/web/src/app/(legal)/datenschutz/page.tsx)
> §5 muss zu dieser Liste passen. Wer hier etwas ändert, ändert die Seite mit —
> im selben PR.
>
> Warum: Die Datenschutzerklärung war ein handgepflegtes Dokument ohne jede
> Kopplung an den Code und beschrieb eine Architektur (Azure App Server + Azure
> Database for PostgreSQL), die es nie gab, während drei tatsächlich genutzte
> Empfänger fehlten. Das ist dieselbe Fehlerklasse wie eine zweite,
> handsynchron gepflegte Score-Berechnung: nichts hält die Kopien zusammen,
> also driften sie.

## Drift-Check

`pnpm --filter @applo/api run check:subprocessors`
([`apps/api/scripts/check-subprocessors.mjs`](../../apps/api/scripts/check-subprocessors.mjs))
schlägt an, wenn `apps/api/src/config/env.schema.ts` eine Zugangs-Env-Variable
(`*_ENDPOINT`, `*_API_KEY`, `*_CLIENT_SECRET`, `*_REST_URL`, `*_TOKEN`, `*_DSN`,
…) enthält, die in diesem Dokument nicht vorkommt. Er läuft im
`lint-and-typecheck`-Job. Ein neuer externer Dienst kann damit nicht mehr
stillschweigend hinzukommen.

Der Check kann nur *fehlende* Einträge finden, nicht *falsche* Beschreibungen.
Beim Ändern eines Datenflusses gilt weiterhin: Text mit anfassen.

## Liste

Die „Env-Schlüssel"-Spalte verbindet den Eintrag mit dem Code; sie ist das, was
der Drift-Check prüft.

| Dienst | Anbieter / Sitz | Zweck | Übermittelte Daten | Env-Schlüssel |
|---|---|---|---|---|
| **Fly.io** | Fly.io Inc., USA — Maschinen in Frankfurt (`fra`) | Hosting der NestJS-API (`smart-apply-api`, `-staging`) | Alle serverseitig verarbeiteten Daten | *(kein Env-Key; siehe `fly.prod.toml` / `fly.staging.toml`)* |
| **Neon** | Neon Inc., USA — Postgres in EU/Frankfurt | Primärdatenbank | Alle Kontodaten, Profil, Bewerbungen, Stellenanzeigen, Sitzungen | `DATABASE_URL`, `DIRECT_URL` |
| **Cloudflare Workers** | Cloudflare Inc., USA | Hosting des Next.js-Frontends (`smart-apply-web`) | Request-Metadaten, Auth-Cookies | *(kein Env-Key; siehe `apps/web/wrangler.jsonc`)* |
| **Cloudflare R2** | Cloudflare Inc., USA — Bucket in EU-Jurisdiktion | Datei-Speicher für generierte PDFs, hochgeladene Lebensläufe, Bewerbungsfotos | Lebensläufe, Anschreiben, Bewerbungsfotos, hochgeladene Stellenanzeigen | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET` |
| **Cloudflare DNS/CDN/Turnstile** | Cloudflare Inc., USA | DNS, CDN, DDoS-Schutz, Bot-Schutz bei Registrierung/Login | IP-Adresse, Request-Header, Turnstile-Token | `TURNSTILE_SECRET_KEY` |
| **Microsoft Azure OpenAI** | Microsoft Ireland Operations Ltd. — Region West Europe (Text), Sweden Central (Sprache) | Generierung von Anschreiben und Lebensläufen, Bewerbungs-Check, Interview-Coach inkl. Sprachmodus | **Vollständige Profil- und Lebenslaufinhalte**, Stellenanzeigen, Anschreiben, im Sprachmodus der Audiostream des Interviews, beim E-Mail-Tracking Absender/Betreff/Textauszug | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_MID_ENDPOINT`, `AZURE_OPENAI_MID_API_KEY`, `AZURE_OPENAI_REALTIME_ENDPOINT`, `AZURE_OPENAI_REALTIME_API_KEY` |
| **Azure AI Foundry** | Microsoft Ireland Operations Ltd., EU | Agent-gestützte ATS-Keyword-Extraktion und URL-Parsing von Stellenanzeigen | Stellenanzeigen-Inhalte, Profilinhalte | `AZURE_AI_FOUNDRY_API_KEY`, `AZURE_AI_FOUNDRY_CV_WRITER_ENDPOINT`, `AZURE_AI_FOUNDRY_CL_WRITER_ENDPOINT`, `PROJECT_ENDPOINT` |
| **Mistral AI** | Mistral AI SAS, Frankreich | Optionale „Fast Lane" für die mechanischen Extraktionsschritte (ATS-Keywords, Job-Fakten, Skill-Auswahl, Interview-Bewertung) | Stellenanzeigen-Inhalte, Profil-Skills, Interview-Antworten | `MISTRAL_ENDPOINT`, `MISTRAL_API_KEY` |
| **Microsoft Graph** | Microsoft Ireland Operations Ltd., EU | E-Mail-Tracking (Premium): Lesezugriff auf das vom Nutzer verbundene Postfach | OAuth-Refresh-Token (verschlüsselt gespeichert), Metadaten und Textauszüge der abgerufenen Nachrichten | `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_TENANT` |
| **Microsoft Entra / Google OAuth** | Microsoft Ireland Operations Ltd. / Google Ireland Ltd. | Anmeldung per „Sign in with …" | Name, E-Mail-Adresse, Profilbild-URL vom Anbieter | `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Upstash Redis** | Upstash Inc., USA — Region EU | Verteiltes Rate-Limiting | Zähler je Nutzerkennung bzw. IP-Adresse, kurze TTL | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Upstash QStash** | Upstash Inc., USA — Region EU | Job-Queue für die Generierungs-Pipeline | **Job-Payloads mit Anwendungs-IDs** (keine Profilinhalte); die Payload wird über QStash transportiert und an unseren Webhook zugestellt | `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `QSTASH_WEBHOOK_URL` |
| **Resend** | Resend Inc., USA | Transaktionale E-Mails (Verifizierung, Passwort-Reset, Benachrichtigungen) | E-Mail-Adresse, Name, Inhalt der jeweiligen Nachricht | `RESEND_API_KEY` |
| **Sentry** | Functional Software Inc., USA | Fehler-Monitoring **server- und clientseitig** | Stack-Traces, Request-Metadaten, `tracesSampleRate: 0.1` im Browser; personenbezogene Felder werden vor Versand gefiltert | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |

## Offene Punkte

- **AVV Fly.io / Neon** — beide sind US-Gesellschaften mit EU-Infrastruktur.
  Der Auftragsverarbeitungsvertrag inkl. SCCs ist zu prüfen und abzuschließen;
  bis dahin ist die Nennung in der Datenschutzerklärung notwendig, aber nicht
  hinreichend.
- **Sentry „Prevent Storing of IP Addresses"** — muss org-seitig im
  Sentry-Projekt aktiviert werden; das ist eine Einstellung in der Sentry-UI,
  nicht im Code, und deshalb hier als Aufgabe geführt.
