import { create } from 'zustand';
import type { SubscriptionTier, SubscriptionUsageStats, TierLimits, TierFeatures } from '@/types';

/**
 * Default tier limits for FREE tier
 * Used when subscription data hasn't been fetched yet
 */
const DEFAULT_LIMITS: TierLimits = {
  applicationsPerMonth: 3,
  coverLettersPerMonth: 3,
  resumesPerMonth: 3,
  jobParsingPerMonth: 10,
  interviewSessionsPerMonth: 0,
  validationsPerMonth: 5,
  applicationsPerDay: 5,
  priority: 'low',
  features: {
    pdfExport: true,
    multipleTemplates: false,
    premiumTemplates: false,
    customBranding: false,
    atsOptimization: false,
    keywordMatching: 'none',
    applicationTracking: 'manual',
    basicAnalytics: false,
    advancedAnalytics: false,
    extendedProfile: false,
    linkedinImport: false,
    multiLanguage: 'none',
    interviewCoach: false,
    emailParsing: false,
    prioritySupport: false,
    noAds: false,
  },
};

const DEFAULT_FEATURES: TierFeatures = DEFAULT_LIMITS.features;

interface SubscriptionState {
  // Data
  subscription: SubscriptionUsageStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Actions
  setSubscription: (subscription: SubscriptionUsageStats) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  // Initial state
  subscription: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Actions
  setSubscription: (subscription) =>
    set({
      subscription,
      isLoading: false,
      error: null,
      lastFetched: new Date(),
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () =>
    set({
      subscription: null,
      isLoading: false,
      error: null,
      lastFetched: null,
    }),
}));

// ============================================
// Selector Hooks (for computed values)
// ============================================

/**
 * Get the current subscription tier
 * Returns 'FREE' as default if no subscription loaded
 */
export function useTier(): SubscriptionTier {
  return useSubscriptionStore((state) => state.subscription?.tier ?? 'FREE');
}

/**
 * Check if user has at least Pro tier
 */
export function useIsPro(): boolean {
  return useSubscriptionStore((state) => {
    const tier = state.subscription?.tier ?? 'FREE';
    return tier === 'PRO' || tier === 'PREMIUM';
  });
}

/**
 * Check if user has Premium tier
 */
export function useIsPremium(): boolean {
  return useSubscriptionStore((state) => state.subscription?.tier === 'PREMIUM');
}

/**
 * Get features for current subscription
 * Returns default FREE features if no subscription loaded
 */
export function useTierFeatures(): TierFeatures {
  return useSubscriptionStore((state) => state.subscription?.features ?? DEFAULT_FEATURES);
}

/**
 * Get applications limit
 */
export function useApplicationsLimit(): number {
  return useSubscriptionStore(
    (state) => state.subscription?.applications.limit ?? DEFAULT_LIMITS.applicationsPerMonth
  );
}

/**
 * Get interview sessions limit
 */
export function useInterviewSessionsLimit(): number {
  return useSubscriptionStore(
    (state) => state.subscription?.interviewSessions.limit ?? DEFAULT_LIMITS.interviewSessionsPerMonth
  );
}
