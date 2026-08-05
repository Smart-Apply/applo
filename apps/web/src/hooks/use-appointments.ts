import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { toastError } from '@/lib/toast';
import type { Appointment, CreateAppointmentInput, UpdateAppointmentInput } from '@/types';

const APPOINTMENTS_KEY = ['appointments'] as const;

/** All calendar appointments for the signed-in user (chronological). */
export function useAppointments() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery<Appointment[]>({
    queryKey: APPOINTMENTS_KEY,
    queryFn: () => api.appointments.list(),
    enabled: isAuthenticated,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const t = useTranslations('dashboard');

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) => api.appointments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
    },
    onError: (error: unknown) => {
      toastError(error, t('page.calendar.toast.saveError'));
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const t = useTranslations('dashboard');

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentInput }) =>
      api.appointments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
    },
    onError: (error: unknown) => {
      toastError(error, t('page.calendar.toast.saveError'));
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const t = useTranslations('dashboard');

  return useMutation({
    mutationFn: (id: string) => api.appointments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
    },
    onError: (error: unknown) => {
      toastError(error, t('page.calendar.toast.deleteError'));
    },
  });
}
