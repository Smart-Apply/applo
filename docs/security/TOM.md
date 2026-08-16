# Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

> Stand: 16. August 2026. Diese Datei beschreibt **umgesetzte** Maßnahmen mit
> Fundstelle im Code. Offene Punkte stehen am Ende als solche — eine TOM-Liste,
> die Vorhaben als Zustand beschreibt, ist wertlos.
>
> Vertiefend: [SECURITY.md](./SECURITY.md),
> [SECURITY_AUDIT_2026-08-13.md](./SECURITY_AUDIT_2026-08-13.md),
> [RATE_LIMITING.md](./RATE_LIMITING.md), [CORS_SECURITY.md](./CORS_SECURITY.md),
> [XSS_PROTECTION.md](./XSS_PROTECTION.md), [CSP_BACKEND.md](./CSP_BACKEND.md),
> [REFRESH_TOKENS.md](./REFRESH_TOKENS.md), [AUDIT_LOGGING.md](./AUDIT_LOGGING.md),
> [SECRETS_ROTATION.md](./SECRETS_ROTATION.md).

## 1. Vertraulichkeit

### Zutritts- und Zugangskontrolle (physisch)

Kein eigenes Rechenzentrum. Die physische Sicherheit liegt bei den
Auftragsverarbeitern (Fly.io Frankfurt, Neon EU/Frankfurt, Cloudflare EU,
Microsoft Azure West Europe / Sweden Central) und ist über deren
Zertifizierungen abgedeckt. Liste: [SUBPROCESSORS.md](./SUBPROCESSORS.md).

### Zugangskontrolle (Authentifizierung)

| Maßnahme | Umsetzung |
|---|---|
| Passwort-Hashing | argon2id (speicherhart), `apps/api/src/auth/auth.service.ts` |
| Passwortstärke | Mindestlänge und Zeichenklassen per DTO-Validierung |
| Abgleich mit Leak-Datenbanken | HIBP k-Anonymity bei Registrierung, Änderung und Zurücksetzen (`PWNED_PASSWORD_CHECK_ENABLED`, `auth/services/pwned-password.service.ts`) |
| Zwei-Faktor-Authentisierung | TOTP (speakeasy) inkl. Backup-Codes, Geheimnis mit AES-256-GCM verschlüsselt |
| Token-Ablage | JWT ausschließlich in HttpOnly-Cookies, `SameSite`, `Secure` in Produktion; kein `localStorage` |
| Refresh-Token | Rotation mit Reuse-Detection (Wiederverwendung widerruft die gesamte Token-Familie), max. 5 je Nutzerin |
| OAuth-Härtung | Verknüpfung nur bei anbieterseitig verifizierter E-Mail (nOAuth-Schutz, `auth/utils/oauth-email-trust.util.ts`) |
| Bot-Schutz | Cloudflare Turnstile bei Registrierung und Login |
| Brute-Force-Schutz | 5 Versuche / 15 Minuten auf Auth-Endpunkten |

### Zugriffskontrolle (Autorisierung)

| Maßnahme | Umsetzung |
|---|---|
| Mandantentrennung | Jede Abfrage ist auf `userId` eingegrenzt; `JwtAuthGuard` auf allen geschützten Routen |
| Administrative Zugriffe | Allowlist über `ADMIN_EMAILS`, fail-closed bei leerer Variable (`admin/admin.guard.ts`) |
| Datei-Zugriff | Signierte URLs mit kurzer Gültigkeit; Bewerbungsfoto nur über authentifizierten Stream mit `Cache-Control: private, no-store` |
| Least Privilege | Getrennte Entra-App für den Postfachzugriff (nur `Mail.Read` + `offline_access`), unabhängig von der Anmelde-App |

### Verschlüsselung

| Gegenstand | Verfahren |
|---|---|
| Transport | TLS überall; HSTS; strikte CSP- und CORS-Header |
| 2FA-Geheimnisse | AES-256-GCM (`TWO_FACTOR_ENCRYPTION_KEY`) |
| Postfach-Refresh-Token | AES-256-GCM (`MAILBOX_TOKEN_ENCRYPTION_KEY`) |
| Passwörter | argon2id (nicht umkehrbar) |
| Nutzerkennung in der KI-Statistik | HMAC-SHA256 mit Salt (`LLM_USAGE_HASH_SALT`) |
| Daten im Ruhezustand | Verschlüsselung durch Neon und Cloudflare R2 |

## 2. Integrität

| Maßnahme | Umsetzung |
|---|---|
| Eingabevalidierung | `class-validator`-DTOs mit `whitelist: true, forbidNonWhitelisted: true` |
| Ausgabe-/Eingabe-Bereinigung | `@Sanitize()`-Decorator, `sanitize-html`, DOMPurify server- und clientseitig |
| CSRF | Double-Submit-Cookie (`csrf-csrf`) mit stabilem Session-Identifier |
| SSRF | Zieladressprüfung und Loopback-Egress-Proxy beim Parsen von Stellenanzeigen-URLs (`common/security/`) |
| Datei-Uploads | Typ- und Größenprüfung, Magic-Byte-Prüfung beim Bewerbungsfoto |
| Webhooks | QStash-Signaturprüfung; Graph-Benachrichtigungen über `clientState` je Verbindung |
| Protokollierung | Sicherheitsereignisse mit Zeitstempel, IP und User-Agent (`common/audit-logger`) |
| Änderungskontrolle | Trunk-based mit Pflicht-PR, CI (Lint, Typecheck, Lockfile-Sync, Migrations-Trockenlauf), CODEOWNERS, lineare Historie |

## 3. Verfügbarkeit und Belastbarkeit

| Maßnahme | Umsetzung |
|---|---|
| Redundanz | Produktion: 2 Maschinen (`min_machines_running = 2`) in Frankfurt |
| Backups | Neon Point-in-Time-Restore, 30 Tage ([MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md)) |
| Wiederherstellung | Forward-only-Migrationen, dokumentierter Rollback-Pfad über PITR |
| Überlastschutz | Zweistufiges Rate-Limiting, Circuit Breaker (opossum) um alle KI-Aufrufe |
| Überwachung | Health-Checks (`/health`, `/health/live`, `/health/ready`), Sentry server- und clientseitig |
| Warteschlange | QStash mit Wiederholungen; Generierung läuft asynchron und ist bei Ausfall nachholbar |

## 4. Verfahren zur regelmäßigen Überprüfung

| Maßnahme | Umsetzung |
|---|---|
| Security-Audits | Dokumentiert unter `docs/security/SECURITY_AUDIT_*.md` (zuletzt 2026-08-13, alle 11 Findings behoben) |
| Abhängigkeiten | Dependabot mit wöchentlichen gruppierten PRs; kritische Major-Versionen bewusst ausgenommen |
| Statische Analyse | CodeQL, ESLint, TypeScript strict |
| Drift-Kontrolle Auftragsverarbeiter | `pnpm --filter @applo/api run check:subprocessors` im CI-Job `lint-and-typecheck` — ein neuer Dienst kann nicht unbemerkt hinzukommen |
| Löschpfad-Kontrolle | E2E-Test `test/e2e/security/account-erasure.e2e-spec.ts` prüft, dass nach der Kontolöschung kein Objekt mehr unter dem Präfix liegt |
| Geheimnis-Rotation | Verfahren für 11 Geheimnistypen in [SECRETS_ROTATION.md](./SECRETS_ROTATION.md) |

## 5. Datenminimierung und Pseudonymisierung

| Maßnahme | Umsetzung |
|---|---|
| E-Mail-Tracking | Lokaler Matcher **vor** der KI-Klassifikation; nicht zuordenbare Nachrichten werden weder übermittelt noch gespeichert. Nachrichtentexte werden nie gespeichert, Auszug auf 1.200 Zeichen begrenzt |
| KI-Nutzungsstatistik | Gesalzener Hash statt Nutzer-ID, keine Inhalte, Widerspruchsschalter mit sofortiger Wirkung |
| Fehler-Monitoring | Kein Session Replay, `sendDefaultPii: false`, serverseitiges Filtern personenbezogener Felder |
| Speicherbegrenzung | Retention-Sweeps für Uploads, E-Mail-Ereignisse, KI-Statistik, Sitzungen (siehe [DELETION_CONCEPT.md](./DELETION_CONCEPT.md)) |
| Exportinhalt | Der Datenexport schließt Zugangsdaten strukturell aus (`select` statt Nachfiltern): kein Token-Chiffrat, kein Webhook-`clientState`, kein TOTP-Geheimnis, kein Geräte-Token-Hash |

## 6. Auftragsverarbeitung

- Empfängerliste: [SUBPROCESSORS.md](./SUBPROCESSORS.md), gekoppelt an das
  Env-Schema.
- **Offen:** AVV inkl. SCC für Fly.io und Neon prüfen und abschließen.
- **Offen:** In Sentry org-seitig „Prevent Storing of IP Addresses“ aktivieren
  (Einstellung in der Sentry-Oberfläche, nicht im Code).

## 7. Meldeprozess bei Datenschutzverletzungen (Art. 33/34)

Kein formalisierter Prozess dokumentiert. Vorhanden sind die Bausteine
(Sentry-Alarme, Sicherheits-Logdateien mit 90 Tagen Rotation,
`SECURITY.md` mit Meldeweg für Schwachstellen). **Offen:** Ablauf mit
72-Stunden-Frist, Meldevorlage und Zuständigkeit schriftlich festhalten.

## 8. Bekannte Lücken

| Lücke | Status |
|---|---|
| AVV Fly.io / Neon | Offen, siehe oben |
| Sentry-IP-Speicherung org-seitig abschalten | Offen |
| Meldeprozess Art. 33/34 | Offen |
| Sicherheits-Logdateien nicht pro Person löschbar | Bewusst akzeptiert, offengelegt im Datenexport und in [DELETION_CONCEPT.md](./DELETION_CONCEPT.md) |
| Unit-Test-Suite teilweise veraltet (`continue-on-error` im CI) | Bekannte technische Schuld, siehe `CONTRIBUTING.md` |
