/**
 * Static message loader. Each feature area owns one namespace file per
 * locale under apps/web/messages/{de,en,fr,es,pt,it}/<namespace>.json —
 * keep all locales structurally identical (same keys) when editing them.
 *
 * Static imports keep this bundler-friendly on the OpenNext/Cloudflare
 * Workers runtime (no fs access at request time). Only the server bundle
 * contains all locales; the client receives the active locale's messages
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
import deOnboarding from '../../messages/de/onboarding.json';
import deProfile from '../../messages/de/profile.json';
import deSeo from '../../messages/de/seo.json';
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
import enOnboarding from '../../messages/en/onboarding.json';
import enProfile from '../../messages/en/profile.json';
import enSeo from '../../messages/en/seo.json';
import enSettings from '../../messages/en/settings.json';
import enSubscription from '../../messages/en/subscription.json';
import enTemplates from '../../messages/en/templates.json';
import enTwoFactor from '../../messages/en/two-factor.json';
import enValidation from '../../messages/en/validation.json';
import enWizard from '../../messages/en/wizard.json';

import frAnalytics from '../../messages/fr/analytics.json';
import frApplications from '../../messages/fr/applications.json';
import frAuth from '../../messages/fr/auth.json';
import frCommon from '../../messages/fr/common.json';
import frDashboard from '../../messages/fr/dashboard.json';
import frEditor from '../../messages/fr/editor.json';
import frFaq from '../../messages/fr/faq.json';
import frInterviews from '../../messages/fr/interviews.json';
import frJobs from '../../messages/fr/jobs.json';
import frLanding from '../../messages/fr/landing.json';
import frOnboarding from '../../messages/fr/onboarding.json';
import frProfile from '../../messages/fr/profile.json';
import frSeo from '../../messages/fr/seo.json';
import frSettings from '../../messages/fr/settings.json';
import frSubscription from '../../messages/fr/subscription.json';
import frTemplates from '../../messages/fr/templates.json';
import frTwoFactor from '../../messages/fr/two-factor.json';
import frValidation from '../../messages/fr/validation.json';
import frWizard from '../../messages/fr/wizard.json';

import esAnalytics from '../../messages/es/analytics.json';
import esApplications from '../../messages/es/applications.json';
import esAuth from '../../messages/es/auth.json';
import esCommon from '../../messages/es/common.json';
import esDashboard from '../../messages/es/dashboard.json';
import esEditor from '../../messages/es/editor.json';
import esFaq from '../../messages/es/faq.json';
import esInterviews from '../../messages/es/interviews.json';
import esJobs from '../../messages/es/jobs.json';
import esLanding from '../../messages/es/landing.json';
import esOnboarding from '../../messages/es/onboarding.json';
import esProfile from '../../messages/es/profile.json';
import esSeo from '../../messages/es/seo.json';
import esSettings from '../../messages/es/settings.json';
import esSubscription from '../../messages/es/subscription.json';
import esTemplates from '../../messages/es/templates.json';
import esTwoFactor from '../../messages/es/two-factor.json';
import esValidation from '../../messages/es/validation.json';
import esWizard from '../../messages/es/wizard.json';

import ptAnalytics from '../../messages/pt/analytics.json';
import ptApplications from '../../messages/pt/applications.json';
import ptAuth from '../../messages/pt/auth.json';
import ptCommon from '../../messages/pt/common.json';
import ptDashboard from '../../messages/pt/dashboard.json';
import ptEditor from '../../messages/pt/editor.json';
import ptFaq from '../../messages/pt/faq.json';
import ptInterviews from '../../messages/pt/interviews.json';
import ptJobs from '../../messages/pt/jobs.json';
import ptLanding from '../../messages/pt/landing.json';
import ptOnboarding from '../../messages/pt/onboarding.json';
import ptProfile from '../../messages/pt/profile.json';
import ptSeo from '../../messages/pt/seo.json';
import ptSettings from '../../messages/pt/settings.json';
import ptSubscription from '../../messages/pt/subscription.json';
import ptTemplates from '../../messages/pt/templates.json';
import ptTwoFactor from '../../messages/pt/two-factor.json';
import ptValidation from '../../messages/pt/validation.json';
import ptWizard from '../../messages/pt/wizard.json';

import itAnalytics from '../../messages/it/analytics.json';
import itApplications from '../../messages/it/applications.json';
import itAuth from '../../messages/it/auth.json';
import itCommon from '../../messages/it/common.json';
import itDashboard from '../../messages/it/dashboard.json';
import itEditor from '../../messages/it/editor.json';
import itFaq from '../../messages/it/faq.json';
import itInterviews from '../../messages/it/interviews.json';
import itJobs from '../../messages/it/jobs.json';
import itLanding from '../../messages/it/landing.json';
import itOnboarding from '../../messages/it/onboarding.json';
import itProfile from '../../messages/it/profile.json';
import itSeo from '../../messages/it/seo.json';
import itSettings from '../../messages/it/settings.json';
import itSubscription from '../../messages/it/subscription.json';
import itTemplates from '../../messages/it/templates.json';
import itTwoFactor from '../../messages/it/two-factor.json';
import itValidation from '../../messages/it/validation.json';
import itWizard from '../../messages/it/wizard.json';

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
    onboarding: deOnboarding,
    profile: deProfile,
    seo: deSeo,
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
    onboarding: enOnboarding,
    profile: enProfile,
    seo: enSeo,
    settings: enSettings,
    subscription: enSubscription,
    templates: enTemplates,
    twoFactor: enTwoFactor,
    validation: enValidation,
    wizard: enWizard,
  },
  fr: {
    analytics: frAnalytics,
    applications: frApplications,
    auth: frAuth,
    common: frCommon,
    dashboard: frDashboard,
    editor: frEditor,
    faq: frFaq,
    interviews: frInterviews,
    jobs: frJobs,
    landing: frLanding,
    onboarding: frOnboarding,
    profile: frProfile,
    seo: frSeo,
    settings: frSettings,
    subscription: frSubscription,
    templates: frTemplates,
    twoFactor: frTwoFactor,
    validation: frValidation,
    wizard: frWizard,
  },
  es: {
    analytics: esAnalytics,
    applications: esApplications,
    auth: esAuth,
    common: esCommon,
    dashboard: esDashboard,
    editor: esEditor,
    faq: esFaq,
    interviews: esInterviews,
    jobs: esJobs,
    landing: esLanding,
    onboarding: esOnboarding,
    profile: esProfile,
    seo: esSeo,
    settings: esSettings,
    subscription: esSubscription,
    templates: esTemplates,
    twoFactor: esTwoFactor,
    validation: esValidation,
    wizard: esWizard,
  },
  pt: {
    analytics: ptAnalytics,
    applications: ptApplications,
    auth: ptAuth,
    common: ptCommon,
    dashboard: ptDashboard,
    editor: ptEditor,
    faq: ptFaq,
    interviews: ptInterviews,
    jobs: ptJobs,
    landing: ptLanding,
    onboarding: ptOnboarding,
    profile: ptProfile,
    seo: ptSeo,
    settings: ptSettings,
    subscription: ptSubscription,
    templates: ptTemplates,
    twoFactor: ptTwoFactor,
    validation: ptValidation,
    wizard: ptWizard,
  },
  it: {
    analytics: itAnalytics,
    applications: itApplications,
    auth: itAuth,
    common: itCommon,
    dashboard: itDashboard,
    editor: itEditor,
    faq: itFaq,
    interviews: itInterviews,
    jobs: itJobs,
    landing: itLanding,
    onboarding: itOnboarding,
    profile: itProfile,
    seo: itSeo,
    settings: itSettings,
    subscription: itSubscription,
    templates: itTemplates,
    twoFactor: itTwoFactor,
    validation: itValidation,
    wizard: itWizard,
  },
} as const;

export type AppMessages = (typeof messages)['de'];

export function messagesFor(locale: Locale) {
  return messages[locale];
}
