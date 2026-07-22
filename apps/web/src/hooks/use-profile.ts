import { useAuthStore } from '@/stores/auth-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toastSuccess, toastError } from '@/lib/toast';
import type { Profile, UpdateProfileDto } from '@/types';
import { useEffect, useRef } from 'react';

function deferRevokeObjectUrl(url: string) {
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

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

/**
 * Hook to fetch the Bewerbungsfoto as an object URL for <img> display.
 * Returns `null` when no photo is uploaded. The object URL is revoked when
 * a newer photo replaces it (query refetch after upload/delete).
 */
export function useProfilePhoto(enabled = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentPhotoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (currentPhotoUrlRef.current) {
        deferRevokeObjectUrl(currentPhotoUrlRef.current);
        currentPhotoUrlRef.current = null;
      }
    };
  }, []);

  return useQuery<string | null>({
    queryKey: ['profile', 'photo'],
    queryFn: async () => {
      const blob = await api.profile.getPhotoBlob();
      return blob ? URL.createObjectURL(blob) : null;
    },
    onSuccess: (nextUrl) => {
      const previousUrl = currentPhotoUrlRef.current;
      if (previousUrl && previousUrl !== nextUrl) {
        deferRevokeObjectUrl(previousUrl);
      }
      currentPhotoUrlRef.current = nextUrl;
    },
    enabled: isAuthenticated && enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to upload/replace the Bewerbungsfoto (JPEG/PNG, max. 2 MB).
 */
export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.profile.uploadPhoto(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'photo'] });
      toastSuccess('Bewerbungsfoto gespeichert');
    },
    onError: (error: unknown) => {
      toastError(error, 'Foto konnte nicht hochgeladen werden');
    },
  });
}

/**
 * Hook to remove the Bewerbungsfoto.
 */
export function useDeleteProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.profile.deletePhoto(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      const previousPhotoUrl = queryClient.getQueryData<string | null>(['profile', 'photo']);
      if (previousPhotoUrl) {
        deferRevokeObjectUrl(previousPhotoUrl);
      }
      queryClient.setQueryData(['profile', 'photo'], null);
      toastSuccess('Bewerbungsfoto entfernt');
    },
    onError: (error: unknown) => {
      toastError(error, 'Foto konnte nicht entfernt werden');
    },
  });
}
