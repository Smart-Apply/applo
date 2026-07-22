import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import type {
  TwoFactorStatus,
  Setup2FAResponse,
  Verify2FASetupDto,
  Verify2FASetupResponse,
  Disable2FADto,
  RegenerateBackupCodesDto,
  TrustedDevice,
  Verify2FALoginDto,
  User,
} from '@/types';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Hook to fetch 2FA status
 */
export function useTwoFactorStatus() {
  return useQuery<TwoFactorStatus>({
    queryKey: ['twoFactorStatus'],
    queryFn: () => api.twoFactor.getStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to start 2FA setup (generates secret and QR code)
 */
export function useSetup2FA() {
  const t = useTranslations('twoFactor');
  return useMutation<Setup2FAResponse, Error, void>({
    mutationFn: () => api.twoFactor.startSetup(),
    onError: (error: Error) => {
      toast.error(error.message || t('hooks.setupError'));
    },
  });
}

/**
 * Hook to verify 2FA setup and enable 2FA
 */
export function useVerify2FASetup() {
  const t = useTranslations('twoFactor');
  const queryClient = useQueryClient();

  return useMutation<Verify2FASetupResponse, Error, Verify2FASetupDto>({
    mutationFn: (data) => api.twoFactor.verifySetup(data),
    onSuccess: () => {
      toast.success(t('hooks.setupEnabled'));
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('hooks.invalidCode'));
    },
  });
}

/**
 * Hook to disable 2FA
 */
export function useDisable2FA() {
  const t = useTranslations('twoFactor');
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, Disable2FADto>({
    mutationFn: (data) => api.twoFactor.disable(data),
    onSuccess: () => {
      toast.success(t('hooks.disabled'));
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
      queryClient.invalidateQueries({ queryKey: ['trustedDevices'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('hooks.disableError'));
    },
  });
}

/**
 * Hook to regenerate backup codes
 */
export function useRegenerateBackupCodes() {
  const t = useTranslations('twoFactor');
  const queryClient = useQueryClient();

  return useMutation<{ backupCodes: string[] }, Error, RegenerateBackupCodesDto>({
    mutationFn: (data) => api.twoFactor.regenerateBackupCodes(data),
    onSuccess: () => {
      toast.success(t('hooks.backupGenerated'));
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('hooks.backupGenerateError'));
    },
  });
}

/**
 * Hook to fetch trusted devices
 */
export function useTrustedDevices() {
  return useQuery<TrustedDevice[]>({
    queryKey: ['trustedDevices'],
    queryFn: () => api.twoFactor.getTrustedDevices(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to revoke a trusted device
 */
export function useRevokeTrustedDevice() {
  const t = useTranslations('twoFactor');
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (deviceId) => api.twoFactor.revokeTrustedDevice(deviceId),
    onSuccess: () => {
      toast.success(t('hooks.deviceRemoved'));
      queryClient.invalidateQueries({ queryKey: ['trustedDevices'] });
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('hooks.deviceRemoveError'));
    },
  });
}

/**
 * Hook to revoke all trusted devices
 */
export function useRevokeAllTrustedDevices() {
  const t = useTranslations('twoFactor');
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, void>({
    mutationFn: () => api.twoFactor.revokeAllTrustedDevices(),
    onSuccess: () => {
      toast.success(t('hooks.allDevicesRemoved'));
      queryClient.invalidateQueries({ queryKey: ['trustedDevices'] });
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('hooks.allDevicesRemoveError'));
    },
  });
}

/**
 * Hook to verify 2FA code during login
 */
export function useVerify2FALogin() {
  const t = useTranslations('twoFactor');
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<{ user: User }, Error, Verify2FALoginDto>({
    mutationFn: (data) => api.twoFactor.verify2FALogin(data),
    onSuccess: (data) => {
      setAuth(data.user);
      toast.success(t('hooks.loginSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('hooks.invalidCode'));
    },
  });
}
