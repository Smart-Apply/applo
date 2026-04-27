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
 * Sentry-free no-op kept to preserve the call sites below. Restore the
 * lazy `import('@sentry/nextjs').then(...)` here if frontend Sentry is
 * re-enabled (see next.config.ts for context).
 */
function setSentryUser(_userId: string | null) {
  // intentionally empty
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
