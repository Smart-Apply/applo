import {
  Briefcase,
  MailCheck,
  MessagesSquare,
  PenLine,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Steps of the onboarding product tour, in order.
 *
 * Copy lives in the `onboarding` message namespace
 * (`tour.steps.<id>.title|description|bullets|cta`) — keep the ids in sync with
 * `apps/web/messages/<locale>/onboarding.json` for all six locales.
 */
export interface OnboardingStep {
  id: string;
  icon: LucideIcon;
  /** Route the step's call-to-action jumps to (the tour closes first). */
  href?: string;
  /** Paid feature — surfaced as a clearly visible badge inside the step. */
  access?: 'pro' | 'premium';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'welcome', icon: Sparkles },
  { id: 'profile', icon: User, href: '/profile' },
  { id: 'jobs', icon: Briefcase, href: '/jobs' },
  { id: 'generate', icon: Wand2, href: '/applications/new' },
  { id: 'editor', icon: PenLine, href: '/applications' },
  { id: 'check', icon: ShieldCheck, href: '/validate' },
  { id: 'interviews', icon: MessagesSquare, href: '/interviews', access: 'pro' },
  { id: 'tracking', icon: MailCheck, href: '/settings?section=notifications', access: 'premium' },
  { id: 'done', icon: Rocket, href: '/applications/new' },
];
