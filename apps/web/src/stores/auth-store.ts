import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearCsrfToken } from '@/lib/csrf';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  
  // Actions
  setAuth: (user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (state: boolean) => void;
}

/**
 * Tag the current Sentry scope with the logged-in user's id (and only the
 * id — never email or name, to keep PII out of the issue tracker).
 *
 * Loaded lazily so this module doesn't pull in @sentry/nextjs at the top
 * of every render path. Silently no-ops if Sentry isn't initialised
 * (e.g. local dev without DSN).
 */
function setSentryUser(userId: string | null) {
  if (typeof window === 'undefined') return;
  import('@sentry/nextjs')
    .then((Sentry) => {
      if (userId) {
        Sentry.setUser({ id: userId });
      } else {
        Sentry.setUser(null);
      }
    })
    .catch(() => {
      // Sentry not loaded — fine.
    });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (user) => {
        setSentryUser(user.id);
        set({
          user,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        clearCsrfToken(); // Clear CSRF token on logout
        setSentryUser(null);
        set({
          user: null,
          isAuthenticated: false,
        });
        // Fetch new CSRF token for next login attempt
        // Note: We don't await this to avoid blocking logout
        import('@/lib/csrf').then(({ fetchCsrfToken }) => {
          fetchCsrfToken().catch(console.error);
        });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'smart-apply-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Re-attach Sentry user after hydration so an existing logged-in
        // session keeps its tag across page reloads.
        if (state?.user?.id) {
          setSentryUser(state.user.id);
        }
      },
    }
  )
);
