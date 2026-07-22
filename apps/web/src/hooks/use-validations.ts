'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { toastSuccess, toastError } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth-store';
import type { CreateValidationInput } from '@/types';

/**
 * Standalone application check ("Bewerbungs-Check"): run an AI quality + ATS
 * review of the user's OWN externally-created application. Metered (Free: 5/mo,
 * Pro+: unlimited).
 */

export function useValidations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['validations'],
    queryFn: () => api.validation.list(),
    enabled: isAuthenticated,
  });
}

export function useValidation(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['validations', id],
    queryFn: () => api.validation.getById(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateValidation() {
  const t = useTranslations('validation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateValidationInput) => api.validation.create(data),
    onSuccess: (record) => {
      queryClient.setQueryData(['validations', record.id], record);
      queryClient.invalidateQueries({ queryKey: ['validations'] });
      // Refresh the remaining-quota badge for free-tier users.
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toastSuccess(t('page.createSuccess'));
    },
    onError: (error: unknown) => {
      toastError(error, t('page.createError'));
    },
  });
}

export function useDeleteValidation() {
  const t = useTranslations('validation');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.validation.delete(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['validations', id] });
      queryClient.invalidateQueries({ queryKey: ['validations'] });
      toastSuccess(t('page.deleteSuccess'));
    },
    onError: (error: unknown) => {
      toastError(error, t('page.deleteError'));
    },
  });
}
