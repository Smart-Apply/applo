import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/**
 * Public auth-time configuration fetched from `GET /api/v1/auth/config`.
 *
 * Cached aggressively (10 min `staleTime`, no refocus refetch) because the
 * gate toggle is a backend env var \u2014 flipping it requires a Fly secrets
 * update, which is far less frequent than the user reloads the page.
 *
 * Why not `NEXT_PUBLIC_REQUIRE_INVITE`: `NEXT_PUBLIC_*` is baked into the
 * Cloudflare Worker bundle at build time, so toggling it would require a
 * full frontend redeploy. Reading at runtime lets the backend flip the
 * gate instantly.
 */
export function useAuthConfig() {
  return useQuery({
    queryKey: ['auth-config'],
    queryFn: () => api.auth.getConfig(),
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Default to "gate is on" while loading so we never accidentally
    // render an invite-code-less form against a gated backend. The DOM
    // for the field appears slightly later, but the worst case is a
    // brief skeleton \u2014 not a confusing 403 after submit.
    placeholderData: { requireInviteCode: true },
  });
}
