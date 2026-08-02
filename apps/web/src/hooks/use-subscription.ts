'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  useSubscriptionStore,
  useTier,
  useIsPro,
  useIsPremium,
  useTierFeatures,
} from '@/stores/subscription-store';
import type { SubscriptionUsageStats, TierLimits } from '@/types';

/**
 * Main hook for subscription management
 * Fetches subscription data and provides access to tier, usage, and limits
 */
export function useSubscription() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { subscription, isLoading: storeLoading, error: storeError, setSubscription, setLoading, setError } = useSubscriptionStore();
  
  // Computed values from store (primitives only to avoid re-render loops)
  const tier = useTier();
  const isPro = useIsPro();
  const isPremium = useIsPremium();
  const features = useTierFeatures();

  // React Query for data fetching with caching
  const {
    data,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery<SubscriptionUsageStats>({
    queryKey: ['subscription'],
    queryFn: () => api.subscription.get(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus to save API calls
  });

  // Sync query data to store
  useEffect(() => {
    if (data) {
      setSubscription(data);
    }
  }, [data, setSubscription]);

  // Sync loading state
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  // Sync error state
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'Failed to load subscription');
    }
  }, [queryError, setError]);

  // Refresh function that can be called manually
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Compute limits from subscription data (memoized to prevent re-renders)
  const limits = useMemo((): TierLimits => {
    if (!subscription) {
      return {
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
    }

    return {
      applicationsPerMonth: subscription.applications.limit,
      coverLettersPerMonth: subscription.coverLetters?.limit ?? 0,
      resumesPerMonth: subscription.resumes?.limit ?? 0,
      jobParsingPerMonth: subscription.jobParsing?.limit ?? 0,
      interviewSessionsPerMonth: subscription.interviewSessions.limit,
      validationsPerMonth: subscription.validations?.limit ?? 0,
      applicationsPerDay: subscription.applicationsToday?.limit ?? 0,
      priority: tier === 'PREMIUM' ? 'high' : tier === 'PRO' ? 'normal' : 'low',
      features: subscription.features,
    };
  }, [subscription, tier]);

  return {
    // Data
    subscription,
    usage: subscription
      ? {
          applications: subscription.applications,
          interviewSessions: subscription.interviewSessions,
          applicationsToday: subscription.applicationsToday,
          periodStart: subscription.periodStart,
          periodEnd: subscription.periodEnd,
        }
      : null,

    // Computed
    tier,
    isPro,
    isPremium,
    limits,
    features,

    // Status
    isLoading: storeLoading || queryLoading,
    error: storeError,

    // Actions
    refresh,
  };
}

/**
 * Check if user can perform a specific action
 * Returns the result from the API including remaining quota
 */
export function useCanPerformAction(action: 'application' | 'interview') {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['subscription', 'can-perform', action],
    queryFn: () => api.subscription.canPerform(action),
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // Fresh for 30 seconds
    gcTime: 60 * 1000, // Cache for 1 minute
  });
}
