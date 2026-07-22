/**
 * Static message loader. Each feature area owns one namespace file per
 * locale under apps/web/messages/{de,en}/<namespace>.json — keep the two
 * locales structurally identical (same keys) when editing them.
 *
 * Static imports keep this bundler-friendly on the OpenNext/Cloudflare
 * Workers runtime (no fs access at request time). Only the server bundle
 * contains both locales; the client receives the active locale's messages
 * serialized through NextIntlClientProvider.
 */

import type { Locale } from './config';

import deAnalytics from '../../messages/de/analytics.json';
import deApplications from '../../messages/de/applications.json';
import deAuth from '../../messages/de/auth.json';
import deCommon from '../../messages/de/common.json';
import deDashboard from '../../messages/de/dashboard.json';
import deEditor from '../../messages/de/editor.json';
import deFaq from '../../messages/de/faq.json';
import deInterviews from '../../messages/de/interviews.json';
import deJobs from '../../messages/de/jobs.json';
import deLanding from '../../messages/de/landing.json';
import deProfile from '../../messages/de/profile.json';
import deSettings from '../../messages/de/settings.json';
import deSubscription from '../../messages/de/subscription.json';
import deTemplates from '../../messages/de/templates.json';
import deTwoFactor from '../../messages/de/two-factor.json';
import deValidation from '../../messages/de/validation.json';
import deWizard from '../../messages/de/wizard.json';

import enAnalytics from '../../messages/en/analytics.json';
import enApplications from '../../messages/en/applications.json';
import enAuth from '../../messages/en/auth.json';
import enCommon from '../../messages/en/common.json';
import enDashboard from '../../messages/en/dashboard.json';
import enEditor from '../../messages/en/editor.json';
import enFaq from '../../messages/en/faq.json';
import enInterviews from '../../messages/en/interviews.json';
import enJobs from '../../messages/en/jobs.json';
import enLanding from '../../messages/en/landing.json';
import enProfile from '../../messages/en/profile.json';
import enSettings from '../../messages/en/settings.json';
import enSubscription from '../../messages/en/subscription.json';
import enTemplates from '../../messages/en/templates.json';
import enTwoFactor from '../../messages/en/two-factor.json';
import enValidation from '../../messages/en/validation.json';
import enWizard from '../../messages/en/wizard.json';

const messages = {
  de: {
    analytics: deAnalytics,
    applications: deApplications,
    auth: deAuth,
    common: deCommon,
    dashboard: deDashboard,
    editor: deEditor,
    faq: deFaq,
    interviews: deInterviews,
    jobs: deJobs,
    landing: deLanding,
    profile: deProfile,
    settings: deSettings,
    subscription: deSubscription,
    templates: deTemplates,
    twoFactor: deTwoFactor,
    validation: deValidation,
    wizard: deWizard,
  },
  en: {
    analytics: enAnalytics,
    applications: enApplications,
    auth: enAuth,
    common: enCommon,
    dashboard: enDashboard,
    editor: enEditor,
    faq: enFaq,
    interviews: enInterviews,
    jobs: enJobs,
    landing: enLanding,
    profile: enProfile,
    settings: enSettings,
    subscription: enSubscription,
    templates: enTemplates,
    twoFactor: enTwoFactor,
    validation: enValidation,
    wizard: enWizard,
  },
} as const;

export type AppMessages = (typeof messages)['de'];

export function messagesFor(locale: Locale) {
  return messages[locale];
}
