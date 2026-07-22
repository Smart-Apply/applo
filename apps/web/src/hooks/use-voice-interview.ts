'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { toastError } from '@/lib/toast';
import type {
  InterviewSessionDetail,
  StartVoiceSessionPayload,
  SubmitVoiceTranscriptPayload,
} from '@/types';

/**
 * Voice interview availability + remaining monthly voice budget. Gate with
 * `enabled: false` for users without the interviewCoach feature so the 403
 * never reaches the console.
 */
export function useVoiceInterviewConfig(options?: { enabled?: boolean }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const gated = options?.enabled ?? true;

  return useQuery({
    queryKey: ['interviews', 'voice', 'config'],
    queryFn: () => api.interviews.voiceConfig(),
    enabled: isAuthenticated && gated,
    staleTime: 60000,
  });
}

/** Mint an ephemeral realtime session for a spoken interview. */
export function useStartVoiceSession(sessionId: string) {
  const t = useTranslations('interviews');
  return useMutation({
    mutationFn: (data?: StartVoiceSessionPayload) =>
      api.interviews.startVoiceSession(sessionId, data ?? {}),
    onError: (error: unknown) => {
      toastError(error, t('hooks.voiceStartError'));
    },
  });
}

/** Submit the spoken transcript and complete the session with AI feedback. */
export function useSubmitVoiceTranscript(sessionId: string) {
  const t = useTranslations('interviews');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitVoiceTranscriptPayload) =>
      api.interviews.submitVoiceTranscript(sessionId, data),
    onSuccess: (session: InterviewSessionDetail) => {
      queryClient.setQueryData(['interviews', 'detail', sessionId], session);
      queryClient.invalidateQueries({ queryKey: ['interviews', 'voice', 'config'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'list'] });
    },
    onError: (error: unknown) => {
      toastError(error, t('hooks.voiceCompleteError'));
    },
  });
}
