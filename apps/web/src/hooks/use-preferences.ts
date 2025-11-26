import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { UserPreferences } from '@/types';

export function usePreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery<UserPreferences>({
    queryKey: ['preferences'],
    queryFn: () => api.preferences.get(),
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) => api.preferences.update(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data);
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}
