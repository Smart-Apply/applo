# DSFA-Vorprüfung (Art. 35 DSGVO)

> Stand: 16. August 2026. Schwellwertanalyse, **keine fertige
> Datenschutz-Folgenabschätzung**. Ergebnis vorweg: Für zwei Verarbeitungen
> ist eine DSFA durchzuführen, bevor Applo öffentlich beworben wird. Diese
> Datei hält fest, warum — damit die Entscheidung überprüfbar ist und nicht
> jedes Mal neu aus dem Bauch getroffen wird.
>
> Grundlage: [RECORDS_OF_PROCESSING.md](./RECORDS_OF_PROCESSING.md) (V1–V11),
> [SUBPROCESSORS.md](./SUBPROCESSORS.md), [TOM.md](./TOM.md),
> [DELETION_CONCEPT.md](./DELETION_CONCEPT.md).

## 1. Prüfmaßstab

Geprüft wird gegen Art. 35(1) und (3) DSGVO sowie die neun Kriterien der
WP248-Leitlinien (übernommen vom EDSA). Als Faustregel gilt: **zwei oder mehr
erfüllte Kriterien ⇒ DSFA erforderlich.** Ergänzend wird die „Muss-Liste“ der
Datenschutzkonferenz herangezogen, die den Einsatz von KI zur Bewertung
persönlicher Aspekte ausdrücklich nennt.

| # | Kriterium (WP248) | Trifft auf Applo zu? |
|---|---|---|
| 1 | Bewertung oder Einstufung („scoring“, „profiling“) | **Ja** — ATS-Score, Bewerbungs-Check mit Gesamt- und Kategoriebewertung, Interview-Bewertung |
| 2 | Automatisierte Entscheidung mit Rechtswirkung | **Nein** — die Ergebnisse sind Entwürfe; über die Bewerbung entscheidet das Unternehmen, nicht Applo (Art. 22 greift nicht) |
| 3 | Systematische Überwachung | **Teilweise** — das optionale E-Mail-Tracking beobachtet fortlaufend ein privates Postfach |
| 4 | Besondere Kategorien oder höchstpersönliche Daten | **Ja** — Lebensläufe enthalten regelmäßig Art.-9-Angaben; ein Bewerbungsfoto lässt Rückschlüsse auf die ethnische Herkunft zu. Zusätzlich der gesamte Berufsweg als höchstpersönliches Dossier |
| 5 | Umfangreiche Verarbeitung | **Derzeit nein**, perspektivisch ja — beworben wird ein Massenmarkt; das Kriterium ist bei Wachstum neu zu bewerten |
| 6 | Abgleich oder Zusammenführung von Datensätzen | **Ja** — Profil, Stellenanzeige und Postfachinhalte werden zusammengeführt |
| 7 | Daten schutzbedürftiger Personen | **Teilweise** — Arbeitssuchende befinden sich in einem strukturellen Ungleichgewicht; Minderjährige sind nicht Zielgruppe |
| 8 | Innovative Technologie | **Ja** — generative Sprachmodelle, Echtzeit-Sprachdialog |
| 9 | Hindernis bei der Ausübung von Rechten | **Nein** — Auskunft und Löschung sind in der Selbstbedienung umgesetzt |

**Erfüllt: 1, 3 (teilweise), 4, 6, 7 (teilweise), 8.** Die Schwelle ist damit
deutlich überschritten.

## 2. Ergebnis je Verarbeitung

| Verarbeitung | Ergebnis |
|---|---|
| **V3 Erstellung von Bewerbungsunterlagen (KI)** und **V4 Bewerbungs-Check** | **DSFA erforderlich.** Kriterien 1, 4, 6, 8. Kern ist die Übermittlung des vollständigen Lebenslaufs — einschließlich möglicher Art.-9-Angaben — an einen externen KI-Anbieter, verbunden mit einer Bewertung persönlicher Aspekte |
| **V6 E-Mail-Tracking** | **DSFA erforderlich.** Kriterien 3, 4, 6. Der Zugriff umfasst technisch das gesamte Postfach und betrifft auch Dritte, die nie in eine Verarbeitung durch Applo eingewilligt haben |
| **V5 Interview-Coach (Sprachmodus)** | **Grenzfall, in die DSFA zu V3 einzubeziehen.** Kriterien 1, 8. Entschärfend: keine Audiospeicherung, direkter Browser-zu-Anbieter-Stream, ausdrückliche Aktivierung durch die Nutzerin |
| **V1, V2, V7, V8, V9, V10, V11** | **Keine DSFA erforderlich.** Übliche Verarbeitungen für Kontoführung, Abrechnung, Sicherheit und Betroffenenrechte; V9 ist pseudonym und inhaltsfrei, V8 beschränkt sich auf Sicherheitszwecke |

## 3. Bereits umgesetzte risikomindernde Maßnahmen

Diese Maßnahmen gehören in die spätere DSFA als Ausgangslage — sie sind
umgesetzt, nicht geplant:

- **Datenminimierung beim Postfachzugriff:** lokaler Matcher **vor** der
  KI-Klassifikation; nicht zuordenbare Nachrichten werden weder übermittelt
  noch gespeichert. Textauszug auf 1.200 Zeichen begrenzt, Nachrichtentexte
  werden nie gespeichert (`mailbox-sync`).
- **Einwilligung mit Aufklärung** vor dem OAuth-Redirect; jederzeitiger
  Widerruf durch Trennen der Verbindung.
- **Löschpfade, die am Speicher hängen:** Präfix-Löschung bei Kontolöschung,
  Retention-Sweeps für Uploads, E-Mail-Ereignisse und KI-Statistik
  ([DELETION_CONCEPT.md](./DELETION_CONCEPT.md)), abgesichert durch einen
  E2E-Test.
- **Wirksamer Widerspruch** gegen die pseudonyme KI-Nutzungsstatistik.
- **Keine Nutzung der Inhalte zum Modelltraining** (Azure OpenAI im
  Enterprise-Modus).
- **EU-Verarbeitung** für Datenbank, Speicher und Sprachmodelle
  (West Europe / Sweden Central, EU-Jurisdiktion bei R2).
- **Verschlüsselung** der Postfach-Token und 2FA-Geheimnisse (AES-256-GCM).
- **Transparenz** über Art.-9-Inhalte in §5 der Datenschutzerklärung, statt
  einer Filterlogik, die nicht zuverlässig funktionieren kann.

## 4. Offene Punkte

| Punkt | Fällig |
|---|---|
| Vollständige DSFA für V3/V4 (inkl. V5 Sprachmodus) durchführen und dokumentieren | Vor öffentlicher Bewerbung des Dienstes |
| Vollständige DSFA für V6 (E-Mail-Tracking) durchführen | Vor Freigabe des Features über die geschlossene Beta hinaus |
| Notwendigkeit eines Datenschutzbeauftragten nach Art. 37(1)(b) erneut bewerten (Kerntätigkeit = umfangreiche regelmäßige und systematische Beobachtung?) — derzeit verneint wegen geringer Nutzerzahl | Bei Erreichen des Massenmarkts, spätestens zur DSFA |
| Kriterium 5 („umfangreich“) bei Nutzerwachstum neu bewerten | Laufend |
| Meldeprozess nach Art. 33/34 schriftlich festhalten | Vor öffentlicher Bewerbung |
| AVV inkl. SCC für Fly.io und Neon abschließen | Vor öffentlicher Bewerbung |

## 5. Warum diese Datei existiert

Die Frage „brauchen wir eine DSFA?“ ist genau die Sorte Entscheidung, die
ohne schriftliche Begründung bei jeder Gelegenheit neu und anders beantwortet
wird. Art. 35 verlangt die Prüfung ohnehin; sie hier festzuhalten kostet
einmal eine Seite und macht später überprüfbar, auf welcher Tatsachengrundlage
entschieden wurde — insbesondere, wenn sich diese Grundlage ändert (mehr
Nutzerinnen, neue Datenquellen, neue Modelle).
