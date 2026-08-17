# Applo - Dokumentation

Übersicht über die Projektdokumentation.

## 📁 Ordnerstruktur

### 🔒 [security/](./security/)

Sicherheitsdokumentation

- **SECURITY.md** - Umfassende Sicherheitsübersicht
- **LLM_USAGE_DATASET.md** - Anonymisierter `llm_usage_events`-Export: Schema, Transformationen, Anonymitätsgarantien (ML / Due Diligence)
- **SECURITY_AUDIT_2026-08-13.md** - Aktuelles Security-Audit gegen die 20-Punkte-Checkliste (Findings F9–F19)
- **SECURITY_AUDIT_2026-07-03.md** - Statisches Security-Audit (Findings F1–F8, abgelöst durch das Audit vom 2026-08-13)
- **CORS_SECURITY.md** - CORS Konfiguration
- **XSS_PROTECTION.md** - XSS-Schutzmaßnahmen
- **AUDIT_LOGGING.md** - Audit-Logging System
- **RATE_LIMITING.md** - Rate Limiting Strategie
- **CSP_BACKEND.md** - Content Security Policy
- **REFRESH_TOKENS.md** - Refresh Token Implementation
- **SUBPROCESSORS.md** - Auftragsverarbeiter (Art. 28) — Single Source of Truth für die Datenschutzerklärung, per CI-Check erzwungen
- **DELETION_CONCEPT.md** - Löschkonzept: Speicherfristen und der Code, der sie durchsetzt
- **RECORDS_OF_PROCESSING.md** - Verzeichnis von Verarbeitungstätigkeiten (Art. 30)
- **TOM.md** - Technische und organisatorische Maßnahmen (Art. 32)
- **DPIA_PRESCREENING.md** - DSFA-Vorprüfung (Art. 35) — Schwellwertanalyse je Verarbeitung

### ✨ [features/](./features/)

Feature-Dokumentation

- **FEATURES.md** - Komplette Feature Liste
- **PDF_GENERATION.md** - PDF-Generierung
- **ATS_SCORE_WEIGHTING.md** - ATS Score Berechnung
- **AUTOMATIC_LANGUAGE_DETECTION.md** - Spracherkennung
- **PROGRAMMATIC_SEO.md** - Berufs-Ratgeber unter `/{locale}/{family}/{beruf}`: URL-Schema, Locale-Auflösung, Content-Modell, hreflang und der CI-Datencheck

### 🔧 [implementation/](./implementation/)

Technische Implementierungsdetails

- **ARCHITECTURE_SECURITY_REVIEW_2026-07-27.md** - Review-Remediation-Record (PRs #710–#720: IDOR-Fix, GenerationService-Split, Throttling, Upload-Dedup, CSRF-Rollout)
- **WIZARD_IMPLEMENTATION.md** - Application Wizard
- **SSE_IMPLEMENTATION.md** - Real-time Updates
- **TEMPLATE_CACHING.md** - Template Cache Strategy
- **BROWSER_POOLING.md** - Puppeteer Browser Pool
- **CIRCUIT_BREAKER.md** - LLM Circuit Breaker
- **DATABASE_INDEX_STRATEGY.md** - DB Optimierung
- **PAGINATION.md** - Pagination Implementation

### 📚 [guides/](./guides/)

Anleitungen

- **PUBLIC_LAUNCH_PLAN.md** - Single source of truth for launch readiness
- **DEVOPS_ROADMAP.md** - Multi-stage env, secrets, releases (shipped state + history)
- **TEMPLATE_GUIDE.md** - Template System Guide
- **TESTING_GUIDE.md** - Testing Best Practices
- **DOMAIN_CLOUDFLARE_SETUP.md** - Cloudflare + Fly.io domain setup (postmortem)
- **SOCIAL_MEDIA_SETUP.md** - `social@applo.ai` mailbox + social account creation runbook
- **DOCKER_OPTIMIZATION.md** - Docker Optimierung
- **MONOREPO_WORKSPACE.md** - Workspace Architektur

### 🗺️ [plans/](./plans/)

Ausführungspläne pro Backlog-Item (ein Plan je Issue + übergreifende Reihenfolge)

- **README.md** - Reihenfolge, Phasen und Begründung für den nicht-delegierten Backlog
- **01–04** - Launch-Blocker ohne Issue (Error-Monitoring, Analytics, SEO/OG, Payments-Entscheidung)
- **05** - Re-Scoping der Prototyp-basierten Issues #758–#765
- **06–09** - Produktqualität (#765 A11y, #571 Motion, #746 Loading, #573 Mobile)
- **10** - LLM-Output-Review (#572, zurückgestellt)

---

## 🚀 Quick Links

| Kategorie      | Link                                                              | Beschreibung                |
| -------------- | ----------------------------------------------------------------- | --------------------------- |
| **Launch**     | [PUBLIC_LAUNCH_PLAN.md](./guides/PUBLIC_LAUNCH_PLAN.md)           | Pre-launch readiness checklist |
| **Pläne**      | [plans/README.md](./plans/README.md)                              | Backlog-Reihenfolge + Pläne je Issue |
| **Sicherheit** | [SECURITY.md](./security/SECURITY.md)                             | Sicherheitsübersicht        |
| **Datenschutz**| [DELETION_CONCEPT.md](./security/DELETION_CONCEPT.md)             | Löschkonzept + Speicherfristen |
| **Templates**  | [TEMPLATE_GUIDE.md](./guides/TEMPLATE_GUIDE.md)                   | Template System             |
| **Testing**    | [TESTING_GUIDE.md](./guides/TESTING_GUIDE.md)                     | Test Anleitungen            |
| **Azure**      | [AZURE_AI_FOUNDRY_AGENTS.md](./guides/AZURE_AI_FOUNDRY_AGENTS.md) | AI Foundry agents           |
