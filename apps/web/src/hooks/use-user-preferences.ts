'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { UpdateUserPreferencesDto, UserPreferences } from '@/types';

const USER_PREFERENCES_KEY = ['user-preferences'] as const;

/** Settings of the signed-in user (notifications, language, theme, onboarding). */
export function useUserPreferences() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<UserPreferences>({
    queryKey: USER_PREFERENCES_KEY,
    queryFn: () => api.userPreferences.get(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserPreferencesDto) => api.userPreferences.update(data),
    onSuccess: (preferences) => {
      queryClient.setQueryData(USER_PREFERENCES_KEY, preferences);
    },
    onError: (error: unknown) => {
      // Deliberately no toast: the only caller so far is the onboarding tour,
      // where a failed write is not user-actionable (the tour has already
      // closed, it would just re-open on the next login). Logging keeps the
      // failure visible instead of swallowing it.
      console.error('Failed to update user preferences:', error);
    },
  });
}
