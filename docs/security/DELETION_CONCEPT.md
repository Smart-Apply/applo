# Löschkonzept (Art. 5(1)(e), 17 DSGVO)

> **Diese Datei ist die Quelle der Wahrheit für Speicherdauern.** §9 der
> Datenschutzerklärung
> ([`apps/web/src/app/(legal)/datenschutz/page.tsx`](../../apps/web/src/app/\(legal\)/datenschutz/page.tsx))
> und die Art.-15-Angaben im Datenexport
> ([`ACCESS_RIGHT_DISCLOSURE` in `apps/api/src/auth/auth.service.ts`](../../apps/api/src/auth/auth.service.ts))
> müssen zu dieser Tabelle passen. Wer hier eine Frist ändert, ändert beide
> Stellen im selben PR.
>
> Warum: Die Datenschutzerklärung behauptete eine 30-tägige
> Wiederherstellungsfrist nach Kontolöschung, die es im Code nie gab
> (`prisma.user.delete` ist ein sofortiger Hard Delete), und nannte
> „Audit-Logs: 90 Tage“ für eine Datenbanktabelle, in die nie geschrieben
> wurde. Beides ist dieselbe Fehlerklasse: eine handgepflegte Frist ohne
> Kopplung an den Job, der sie durchsetzt (Issue #806).

## Grundsätze

1. **Löschung hängt am Löschpfad, nicht am Aufrufer.** Wer eine Zeile
   entfernt, muss die zugehörigen Objekte im Speicher mitentfernen. Deshalb
   ruft `CleanupCron` `ApplicationsService.hardDelete()` bzw.
   `JobPostingsService.hardDeleteJobPosting()` auf, statt selbst ein
   `deleteMany` abzusetzen — die alte Variante hat die Datenbankzeile
   entfernt und das PDF mit dem vollständigen Lebenslauf unbefristet in R2
   liegen lassen.
2. **Präfix statt bekannter Schlüssel.** Die Kontolöschung räumt
   `<userId>/`, `applications/<id>/` und `profiles/<id>/` als Präfixe ab
   ([`UserErasureService`](../../apps/api/src/common/erasure/user-erasure.service.ts)).
   Ein Schlüssel, den die Datenbank nie kannte (Roh-Uploads) oder vergessen
   hat, ist sonst genau der Fall, der ewig überlebt.
3. **Eine Implementierung pro Löschvorgang.** Selbstbedienung
   (`AuthService.deleteAccount`) und Support-Löschung
   (`DELETE /admin/users/:email`) teilen sich `UserErasureService`. Zwei
   handgepflegte Kopien sind der Grund, warum die Kontolöschung ursprünglich
   nur generierte PDFs erfasst hat.
4. **Fristen sind konfigurierbar, aber nicht abschaltbar gemeint.** Die
   `*_RETENTION_DAYS`-Variablen erlauben `0` (Sweep aus) — das ist ein
   Notventil für den Betrieb, kein Normalzustand. Die Cron-Jobs loggen in
   dem Fall eine Warnung.

## Fristen

| Datenbestand | Ort | Frist | Durchgesetzt durch |
|---|---|---|---|
| Konto inkl. Profil, Bewerbungen, Stellenanzeigen, Terminen, Bewerbungs-Checks, Interviews, Sitzungen, Postfachverbindungen | Postgres (Kaskade über `User`) | **Sofort** bei Kontolöschung — kein Papierkorb, keine Wiederherstellungsfrist | [`UserErasureService.eraseUser`](../../apps/api/src/common/erasure/user-erasure.service.ts) über `AuthService.deleteAccount` bzw. `AdminController` |
| Dateien des Kontos (Roh-Uploads, generierte PDFs, Bewerbungsfoto) | R2 / Disk | **Sofort** bei Kontolöschung (Präfix-Löschung, best effort mit Log bei Fehlschlag) | `UserErasureService` → `StorageService.tryDeleteByPrefix` |
| Gelöschte Bewerbung (Soft Delete) inkl. erzeugter PDFs | Postgres + R2 | **30 Tage** | [`CleanupCron.cleanupDeletedApplications`](../../apps/api/src/common/cron/cleanup.cron.ts) → `ApplicationsService.hardDelete` (00:00 täglich) |
| Gelöschte Stellenanzeige (Soft Delete) inkl. Upload-Datei und kaskadierter Bewerbungs-PDFs | Postgres + R2 | **30 Tage** | `CleanupCron.cleanupDeletedJobPostings` → `JobPostingsService.hardDeleteJobPosting` (00:05 täglich) |
| Verwaiste Uploads (`<userId>/…`, nie zu einer `JobPosting` geworden) | R2 / Disk | **`UPLOAD_RETENTION_DAYS`, Default 7 Tage** | [`OrphanedUploadCron`](../../apps/api/src/common/cron/orphaned-upload.cron.ts) (03:30 täglich, referenzgetrieben) |
| `application_email_events` (Absender, Absendername, Betreff, Klassifikation) | Postgres | **`MAILBOX_EVENT_RETENTION_DAYS`, Default 180 Tage** | [`MailboxEventRetentionCron`](../../apps/api/src/mailbox-sync/mailbox-event-retention.cron.ts) (04:30 täglich) |
| `llm_usage_events` (pseudonyme KI-Nutzungsstatistik) | Postgres | **`LLM_USAGE_RETENTION_DAYS`, Default 90 Tage**, zusätzlich sofort bei Kontolöschung | [`LlmUsageRetentionCron`](../../apps/api/src/llm/usage/llm-usage-retention.cron.ts) (04:00 täglich) + `LlmUsageService.deleteEventsForActor` |
| Sicherheits-Logdateien (`logs/audit-*.log`: Ereignis, E-Mail, IP, User-Agent) | Dateisystem der API-Maschine | **90 Tage** (Rotation) | `winston-daily-rotate-file` (`maxFiles: '90d'`) in [`AuditLoggerService`](../../apps/api/src/common/audit-logger/audit-logger.service.ts) |
| Sitzungen und Refresh-Token | Postgres | Längstens **30 Tage** (`SESSION_EXPIRATION_DAYS`, `JWT_REFRESH_EXPIRES_IN`); abgelaufene/widerrufene Einträge werden täglich entfernt | [`SessionCleanupCron`](../../apps/api/src/auth/session-cleanup.cron.ts) (02:00 / 03:00 täglich) |
| Postfachverbindung inkl. verschlüsseltem Refresh-Token | Postgres | **Sofort** beim Trennen durch die Nutzerin (zusätzlich Widerruf des Graph-Abonnements) | `MailboxSyncController` → `MailboxConnectionService` |
| Datenbank-Backups / Point-in-Time-Restore | Neon | **30 Tage** (Neon Launch Plan) | Anbieterseitig, siehe [MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md) |

## Bekannte Grenzen

- **Backups.** Eine Löschung wirkt nicht rückwirkend in das
  Neon-PITR-Fenster. Ein Restore innerhalb von 30 Tagen kann gelöschte
  Datensätze zurückholen. Das ist zulässig, solange die Wiederherstellung
  dokumentiert und die Löschung danach erneut ausgeführt wird — der
  Löschauftrag ist also nach jedem Restore zu wiederholen. Ein Ablauf dafür
  existiert bisher nur als Notiz in [MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md)
  und ist auszubauen, sobald es einen echten Restore gab.
- **Sicherheits-Logdateien.** Sie liegen auf der Maschine, nicht in der
  Datenbank, und lassen sich nicht pro Nutzerin löschen. Sie enthalten
  E-Mail-Adresse und IP zu sicherheitsrelevanten Ereignissen; Rechtsgrundlage
  ist Art. 6(1)(f). Sie sind deshalb weder Teil des Datenexports noch der
  Kontolöschung, was der Export unter `securityLogs` ausdrücklich offenlegt.
  Bei einem Löschverlangen nach Art. 17 bleibt die Rotationsfrist von 90
  Tagen die Obergrenze.
- **`llm_usage_events` nach Salt-Rotation.** Wird `LLM_USAGE_HASH_SALT`
  gewechselt, findet die Erasure-Funktion ältere Zeilen nicht mehr (der
  `actorHash` lässt sich nicht mehr nachbilden). Diese Zeilen räumt der
  Retention-Sweep ab. Der Salt ist deshalb in der Praxis als append-only zu
  behandeln.
- **Objektspeicher-Fehler bei der Kontolöschung.** Die Präfix-Löschung läuft
  nach dem `user.delete` und ist best effort: ein Speicher-Ausfall darf keine
  unlöschbare Nutzerzeile erzeugen. Fehler werden geloggt; ein erneuter
  Löschlauf ist manuell über den Objektspeicher nachzuholen.

## Prüfung

- `apps/api/test/e2e/security/account-erasure.e2e-spec.ts` — Konto löschen,
  danach ist das Storage-Präfix leer. Genau diese Prüfung fehlte, weshalb der
  Fehler unbemerkt blieb.
- Unit-Tests: `cleanup.cron.unit.spec.ts`, `orphaned-upload.cron.unit.spec.ts`,
  `user-erasure.service.unit.spec.ts`, `disk-storage.provider.unit.spec.ts`.
