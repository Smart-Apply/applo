import { create } from 'zustand';

/**
 * Open/close state of the onboarding product tour.
 *
 * The tour itself is mounted once in the dashboard layout, but it has to be
 * launchable from anywhere (sidebar help entry, settings page), so the state
 * lives in a store instead of being threaded through props.
 *
 * Whether the tour AUTO-opens on first login is NOT stored here — that is
 * derived from `UserPreferences.onboardingCompleted` (see OnboardingTour).
 */
interface OnboardingTourState {
  isOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
}

export const useOnboardingTourStore = create<OnboardingTourState>((set) => ({
  isOpen: false,
  openTour: () => set({ isOpen: true }),
  closeTour: () => set({ isOpen: false }),
}));
