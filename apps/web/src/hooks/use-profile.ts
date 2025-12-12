import { useAuthStore } from '@/stores/auth-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toastSuccess, toastError } from '@/lib/toast';
import type { Profile, UpdateProfileDto } from '@/types';

/**
 * Hook to fetch user profile
 */
export function useProfile() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: () => api.profile.get(),
    enabled: isAuthenticated,
    staleTime: Infinity, // Never refetch automatically, only on invalidation or manual refetch
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: (data: UpdateProfileDto) => api.profile.update(data),
    
    // Optimistic update: Apply changes immediately to cache
    onMutate: async (updateData) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['profile'] });
      
      // Snapshot previous value for rollback
      const previousProfile = queryClient.getQueryData<Profile>(['profile']);
      
      // Optimistically update cache with new data
      if (previousProfile) {
        queryClient.setQueryData(['profile'], {
          ...previousProfile,
          ...updateData,
          // Merge nested arrays if provided
          skills: updateData.skills ?? previousProfile.skills,
          experiences: updateData.experiences ?? previousProfile.experiences,
          education: updateData.education ?? previousProfile.education,
          certificates: updateData.certificates ?? previousProfile.certificates,
          projects: updateData.projects ?? previousProfile.projects,
          languages: updateData.languages ?? previousProfile.languages,
          updatedAt: new Date().toISOString(),
        });
      }
      
      // Return context with snapshot for rollback
      return { previousProfile };
    },
    
    // Rollback on error
    onError: (error: unknown, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile'], context.previousProfile);
      }
      toastError(error, 'Fehler beim Aktualisieren des Profils');
    },
    
    // Replace optimistic data with server response on success
    onSuccess: (updatedProfile, variables) => {
      // Update cache directly with the server response (no refetch)
      queryClient.setQueryData(['profile'], updatedProfile);
      
      // Update user in auth store if firstName or lastName was changed
      if (variables.firstName || variables.lastName) {
        updateUser({ 
          firstName: variables.firstName, 
          lastName: variables.lastName 
        });
      }
      
      toastSuccess('Profil erfolgreich aktualisiert');
    },
  });
}
