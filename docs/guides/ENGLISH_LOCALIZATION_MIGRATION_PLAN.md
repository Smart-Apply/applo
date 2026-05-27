# English Localization Migration Plan (Smart Apply)

## Goal
Ship a production-ready English experience without breaking existing German flows.

## Scope
This plan covers:
- Frontend UI text localization (Next.js App Router)
- Validation and user-facing error messages
- Transactional email content
- PDF/template language output consistency
- SEO and legal page language variants
- QA, rollout, and rollback strategy

This plan does not include:
- Full legal review of translated policy text by counsel
- New feature development unrelated to localization

## Delivery Model
- Strategy: incremental rollout (DE remains default, EN introduced safely)
- Translation source of truth: key-based dictionaries in the web app
- Quality bar: no regressions in auth, profile, job posting ingestion, application generation, or download flows

## Estimated Effort
- UI-only localization: 2-4 days
- UI + validation + emails: 4-7 days
- Full localization (PDF/prompting/SEO/legal/QA): 1-2 weeks

## 7-Day Implementation Plan

### Day 1 - Foundation and Inventory
**Objectives**
- Decide i18n architecture and naming conventions
- Inventory all user-facing text in frontend and backend outputs

**Tasks**
1. Implement locale routing strategy for App Router (`de`, `en`), with `de` default.
2. Create dictionary structure and key naming convention.
3. Build a text inventory checklist:
   - Navigation, buttons, labels, placeholders
   - Form errors, toasts, empty states
   - SEO metadata and page titles
   - Auth and settings pages
4. Freeze UI copy during migration window (to reduce churn).

**Definition of Done**
- Locale infrastructure works for at least one page in both `de` and `en`.
- Shared key convention documented and approved.
- Text inventory checklist complete.

---

### Day 2 - Core User Journey (Auth + Navigation + Dashboard Shell)
**Objectives**
- Localize the highest-traffic screens first

**Tasks**
1. Localize auth pages (login, register, reset password, 2FA screens).
2. Localize main navigation and dashboard shell.
3. Localize profile section headers and primary CTAs.
4. Add fallback behavior for missing translation keys.

**Definition of Done**
- A user can switch DE/EN and complete sign-in/sign-up flows in both languages.
- No hardcoded strings remain in auth and shell components.

---

### Day 3 - Forms, Validation, and Error Handling
**Objectives**
- Ensure all interactive and failure states are localized

**Tasks**
1. Localize form labels, helper text, and placeholders.
2. Localize Zod or client-side validation messages.
3. Localize API error mapping and toast messages.
4. Confirm invite-code, OAuth, and session-related messages are localized.

**Definition of Done**
- No German-only validation or error strings appear in EN mode.
- Critical error paths (401, 403, 404, 429, 500) are readable and consistent in EN.

---

### Day 4 - Email Templates and Notifications
**Objectives**
- Align outbound communication language with user preference

**Tasks**
1. Add language-aware email templates (DE/EN) for:
   - verification/reset/recovery mails
   - transactional notifications
2. Store/reuse user language preference in notification paths.
3. Verify text rendering and encoding in major mail clients.

**Definition of Done**
- Email language follows user preference reliably.
- No mixed-language email bodies in end-to-end tests.

---

### Day 5 - Resume/Cover Letter Output and Prompting
**Objectives**
- Keep generated content language-consistent

**Tasks**
1. Add explicit language controls to generation pipeline (UI language and/or job-posting language rules).
2. Validate prompt templates and output formatting for EN.
3. Localize static strings used in PDF sections and labels.
4. Run quality checks for generated CV/CL in both languages.

**Definition of Done**
- EN users receive EN output by default (unless explicit override rules apply).
- PDF templates render correctly with EN text length and spacing.

---

### Day 6 - SEO, Legal Pages, and Content QA
**Objectives**
- Make EN pages discoverable and production-safe

**Tasks**
1. Add localized metadata, titles, descriptions, and canonical/hreflang tags.
2. Localize landing page copy and key marketing blocks.
3. Translate legal/support pages required for launch (at minimum: FAQ, contact, key policy summaries).
4. Run content QA pass for tone, terminology, and consistency.

**Definition of Done**
- EN and DE pages have clean metadata and no duplicate-canonical issues.
- Launch-critical legal/support content is available in EN.

---

### Day 7 - End-to-End QA, Rollout, and Monitoring
**Objectives**
- Release safely with rollback confidence

**Tasks**
1. Execute bilingual regression checklist:
   - auth/session
   - profile CRUD
   - job posting parse/import
   - application generation + download
   - payment/subscription views (if exposed)
2. Perform responsive QA (mobile + desktop) for both locales.
3. Release via feature flag or controlled rollout.
4. Monitor errors and user behavior by locale.

**Definition of Done**
- No P0/P1 issues in EN flows.
- Rollback plan tested and documented.
- Post-release monitoring dashboard includes locale segmentation.

## Architecture Recommendations
1. Use translation keys only (no inline text in components).
2. Keep locale dictionaries flat and domain-grouped (auth/profile/applications/common).
3. Centralize formatting (dates, currency, pluralization) via locale-aware helpers.
4. Add missing-key detection in CI or pre-merge checks.

## Risks and Mitigations
1. **Mixed-language UX**
   - Mitigation: strict key audits + fallback logging.
2. **Prompt/output language drift**
   - Mitigation: explicit language parameter in generation pipeline.
3. **Layout breaks from longer EN copy**
   - Mitigation: responsive QA for all critical screens.
4. **Inconsistent error messages**
   - Mitigation: central error mapping and shared translation keys.

## Acceptance Criteria
- Users can complete core product flows in EN without DE leakage.
- Email and generated documents follow intended language behavior.
- SEO and metadata are correctly localized.
- Monitoring confirms stable EN usage after rollout.

## Suggested Rollout Strategy
1. Internal-only EN flag (team testing)
2. Closed beta EN access (small cohort)
3. Full EN availability

## Rollback Strategy
- Keep `de` as guaranteed default.
- Toggle off EN locale via feature flag/config if severe issues occur.
- Preserve dictionary versioning so fast hotfixes are possible.

## Appendix: Execution Checklist
- Locale routing configured
- Dictionaries created and reviewed
- Auth localized
- Dashboard localized
- Validation and errors localized
- Email templates localized
- PDF and generation prompts localized
- SEO/hreflang complete
- Mobile and desktop bilingual QA complete
- Rollout + monitoring configured
