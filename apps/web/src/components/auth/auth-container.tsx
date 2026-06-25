'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AppLogo } from '@/components/ui/app-logo';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLogo } from '@/components/ui/app-logo';
import { api, resetAuthRedirectFlag } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthConfig } from '@/hooks/use-auth-config';
import { toast } from '@/lib/toast';
import { TwoFactorChallengeForm } from '@/components/two-factor';
import { TurnstileWidget, resetTurnstile } from '@/components/auth/turnstile-widget';
import { AuthApplo, type AuthApploState } from '@/components/auth/auth-applo';
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/lib/validation/schemas';
import './auth.css';

type LoginFormData = LoginFormValues;
type RegisterFormData = RegisterFormValues;

interface AuthContainerProps {
  initialMode?: 'login' | 'register';
}

/* ---------- password strength (presentational; zod owns real rules) ---------- */
function scorePw(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  { label: '', color: 'var(--aa-border)' },
  { label: 'Schwach', color: '#dc2626' },
  { label: 'Okay', color: '#e0951a' },
  { label: 'Gut', color: '#2563eb' },
  { label: 'Stark', color: '#15a34a' },
];
const COVER_BY_SCORE = [0, 0.32, 0.58, 0.82, 1];

/* ---------- inline icons ---------- */
function IcEye() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IcEyeOff() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.2 4M6.2 6.2A16 16 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 4.3-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}
function IcAlert() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IcInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function IcGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.7 3.2-7.9Z" />
      <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8L6 14.4Z" />
      <path fill="#EA4335" d="M12 5.6c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.6 6-4.6Z" />
    </svg>
  );
}
function IcMicrosoft() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  );
}

/* ---------- field wrapper ---------- */
function Field({
  label,
  error,
  action,
  children,
}: {
  label: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label>{label}</label>
        {action}
      </div>
      {children}
      {error && (
        <div className="err">
          <IcAlert />
          {error}
        </div>
      )}
    </div>
  );
}

export function AuthContainer({ initialMode = 'login' }: AuthContainerProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [show2FAChallenge, setShow2FAChallenge] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  // Cloudflare Turnstile token for the registration form.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Applo-driving UI state (presentational only).
  const [focused, setFocused] = useState<string | null>(null);
  const [show, setShow] = useState({ pw: false, pw2: false });
  const [errorPulse, setErrorPulse] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated, hasHydrated } = useAuthStore();
  // Closed-beta invite-code gate — default TRUE while loading so we never
  // flash a gate-less form against a gated backend.
  const { data: authConfig } = useAuthConfig();
  const requireInviteCode = authConfig?.requireInviteCode ?? true;

  // Surface OAuth callback errors redirected back to /login?oauth=error.
  useEffect(() => {
    if (searchParams.get('oauth') !== 'error') return;
    const message = searchParams.get('message');
    if (message === 'invite_required') {
      toast.error(
        'Applo ist gerade in der geschlossenen Beta. Bitte registriere dich zuerst mit deinem Einladungscode \u2014 danach kannst du Google / Microsoft in den Einstellungen verknüpfen.',
        { duration: 12000 },
      );
    } else if (message === 'authentication_failed') {
      toast.error('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    } else {
      toast.error('Bei der Anmeldung ist ein Fehler aufgetreten.');
    }
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Redirect to dashboard if already authenticated.
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Sync mode with URL.
  useEffect(() => {
    if (pathname === '/login') {
      setIsLogin(true);
    } else if (pathname === '/register') {
      setIsLogin(false);
    }
  }, [pathname]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      inviteCode: '',
    },
  });

  // Live register password — only used to drive the mascot's squint level.
  const registerPassword = useWatch({ control: registerForm.control, name: 'password' }) ?? '';
  const pwScore = scorePw(registerPassword);

  const isSubmitting = loginForm.formState.isSubmitting || registerForm.formState.isSubmitting;
  const busy = isSubmitting;

  // Flash the worried/shake pose for ~0.9s on any validation or API error.
  const pulseError = () => {
    setErrorPulse(true);
    setTimeout(() => setErrorPulse(false), 900);
  };

  const switchMode = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setFocused(null);
    setShow({ pw: false, pw2: false });
    setErrorPulse(false);
    // Update URL without a full page reload.
    window.history.pushState({}, '', toLogin ? '/login' : '/register');
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      const response = await api.auth.login(data);

      // 2FA required → hand off to the challenge form.
      if (response.requiresTwoFactor && response.challengeToken) {
        setChallengeToken(response.challengeToken);
        setShow2FAChallenge(true);
        return;
      }

      if (response.user) {
        resetAuthRedirectFlag();
        setAuth(response.user);
        toast.success('Erfolgreich angemeldet!');
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      pulseError();
      const { ApiError, getErrorMessage } = await import('@/lib/errors');
      if (ApiError.isApiError(error)) {
        if (error.status === 401) {
          toast.error('Ungültige E-Mail oder Passwort.');
        } else if (error.status === 429) {
          toast.error('Zu viele Login-Versuche. Bitte warte 15 Minuten.', { duration: 8000 });
        } else {
          toast.error(getErrorMessage(error));
        }
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handle2FASuccess = () => {
    resetAuthRedirectFlag();
    toast.success('Erfolgreich angemeldet!');
    router.push('/dashboard');
  };

  const handle2FACancel = () => {
    setShow2FAChallenge(false);
    setChallengeToken(null);
    loginForm.reset();
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    // If Turnstile is configured but hasn't produced a token yet, stop
    // before hitting the backend for a clearer message.
    const turnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    if (turnstileConfigured && !turnstileToken) {
      pulseError();
      toast.error(
        'Bitte löse zuerst das CAPTCHA unten. Falls es nicht erscheint, deaktiviere kurz den Tracking-Schutz / Adblocker für diese Seite.',
        { duration: 8000 },
      );
      return;
    }

    // Client-side guard for the invite-code gate (server is authoritative).
    if (requireInviteCode && !data.inviteCode?.trim()) {
      registerForm.setError('inviteCode', { type: 'manual', message: 'Bitte gib deinen Einladungscode ein.' });
      pulseError();
      return;
    }

    try {
      const { confirmPassword: _confirmPassword, inviteCode, ...registerData } = data;
      const response = await api.auth.register({
        email: registerData.email,
        password: registerData.password,
        firstName: registerData.firstName || '',
        lastName: registerData.lastName || '',
        turnstileToken: turnstileToken ?? undefined,
        inviteCode: inviteCode?.trim() || undefined,
      });
      resetAuthRedirectFlag();
      setAuth(response.user);
      toast.success('Account erfolgreich erstellt!');
      router.push('/onboarding');
    } catch (error: unknown) {
      pulseError();
      const { ApiError, getErrorMessage } = await import('@/lib/errors');
      // Reset the widget so the user can solve a fresh challenge.
      resetTurnstile();
      setTurnstileToken(null);

      if (ApiError.isApiError(error)) {
        if (error.data?.code === 'CAPTCHA_FAILED') {
          toast.error(
            'Bot-Schutz fehlgeschlagen. Bitte löse das CAPTCHA erneut. Wenn es nicht erscheint, deaktiviere kurz den Tracking-Schutz oder Adblocker für diese Seite.',
            { duration: 10000 },
          );
        } else if (error.data?.code === 'INVITE_CODE_REQUIRED') {
          registerForm.setError('inviteCode', { type: 'manual', message: 'Bitte gib deinen Einladungscode ein.' });
          toast.error('Applo ist gerade in der geschlossenen Beta. Bitte gib deinen Einladungscode ein.', {
            duration: 8000,
          });
          toast.error(
            'Applo ist gerade in der geschlossenen Beta. Bitte gib deinen Einladungscode ein.',
            { duration: 8000 },
          );
        } else if (error.data?.code === 'INVITE_CODE_INVALID') {
          registerForm.setError('inviteCode', { type: 'manual', message: 'Code ist ungültig.' });
          toast.error('Dieser Einladungscode ist ungültig. Bitte überprüfe die Schreibweise.');
        } else if (error.data?.code === 'INVITE_CODE_ALREADY_USED') {
          registerForm.setError('inviteCode', { type: 'manual', message: 'Code wurde bereits verwendet.' });
          toast.error('Dieser Einladungscode wurde bereits eingelöst.');
        } else if (error.data?.code === 'INVITE_CODE_EXPIRED') {
          registerForm.setError('inviteCode', { type: 'manual', message: 'Code ist abgelaufen.' });
          toast.error('Dieser Einladungscode ist abgelaufen.');
        } else if (error.status === 400 || error.status === 409) {
          toast.error('Diese E-Mail-Adresse ist bereits registriert.');
        } else if (error.status === 429) {
          toast.error('Zu viele Registrierungsversuche. Bitte warte 15 Minuten.', { duration: 8000 });
        } else {
          toast.error(getErrorMessage(error));
        }
      } else {
        toast.error('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      }
    }
  };

  /* ---- derive Applo pose + speech ---- */
  let applo: AuthApploState = 'idle';
  let coverLevel = 0;
  if (isSubmitting) applo = 'load';
  else if (errorPulse) applo = 'error';
  else if (focused === 'password' || focused === 'confirmPassword') {
    const vis = focused === 'password' ? show.pw : show.pw2;
    if (vis) applo = 'peek';
    else if (!isLogin && focused === 'password') {
      applo = 'squint';
      coverLevel = COVER_BY_SCORE[pwScore];
    } else {
      applo = 'cover';
    }
  } else if (focused) {
    applo = 'look';
  }

  const squintSpeech = [
    'Ich halt mich noch zurück …',
    'Ich heb schon mal die Hände …',
    'Hände hoch — ich guck weg …',
    'Fast ganz zugehalten …',
    'Augen fest zugehalten, versprochen!',
  ][pwScore];
  const speech = {
    idle: 'Schön, dass du da bist!',
    look: 'Ich schau schon mal mit …',
    cover: 'Keine Sorge — ich guck weg!',
    peek: 'Na gut, ein kleiner Blick …',
    squint: squintSpeech,
    load: 'Einen Moment …',
    success: isLogin ? 'Schön, dich zu sehen!' : 'Willkommen an Bord!',
    error: 'Hoppla, schau nochmal drüber.',
  }[applo];

  const tagline = isLogin
    ? 'Deine Bewerbungen, organisiert wie ein System statt wie ein Chaos.'
    : 'Tritt der geschlossenen Beta bei und mach Bewerben planbar.';

  // 2FA challenge takes over the whole screen.
  if (show2FAChallenge && challengeToken) {
    return (
      <div className="applo-auth">
        <div style={{ width: '100%', maxWidth: 420 }}>
          <TwoFactorChallengeForm
            challengeToken={challengeToken}
            onSuccess={handle2FASuccess}
            onCancel={handle2FACancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      {/* Container: full-width on mobile so the form actually fits a 360px
          viewport; locks to the original 1040x800 design on md+ desktop
          where the sliding-panel animation works. */}
      <div className="relative min-h-[640px] w-full max-w-[1040px] overflow-hidden rounded-xl bg-card shadow-lg border border-border md:h-[800px]">
        {/* Sliding Branding Panel — desktop only. Hidden below md: because
            it consumed half the screen width and squashed the form on
            iPhone-sized viewports (visible in the wave-2 E2E screenshots). */}
        <div
          className={`absolute top-0 z-20 hidden h-full w-1/2 transform transition-transform duration-500 ease-in-out md:block ${isLogin ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-primary p-12">
            {/* Background Texture - Curved Lines */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 500 756"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              <path
                d="M-30 0 Q 80 200, 50 400 Q 20 600, 80 756"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
                fill="none"
              />
              <path
                d="M520 0 Q 400 200, 430 400 Q 460 600, 380 756"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
                fill="none"
              />
            </svg>

            {/* Content */}
            <div className="relative z-10 flex h-full w-full flex-col justify-center px-4">
              {/* Login Branding (Logo + Applo) */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${isLogin && !isAnimating ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                <AppLogo className="h-40 w-auto brightness-0 invert" />
              </div>

              {/* Register Branding (Motto) */}
              <div
                className={`absolute inset-0 flex flex-col justify-center px-4 transition-opacity duration-300 ${!isLogin && !isAnimating ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                <div className="mb-16 flex justify-center">
                  <AppLogo className="h-20 w-auto brightness-0 invert" />
                </div>
                <div className="space-y-1">
                  <div className="w-[321px] text-left">
                    <p className="font-poppins text-[45px] font-extrabold leading-normal text-primary-foreground">
                      Where
                    </p>
                    <p className="font-poppins text-[45px] font-extrabold leading-normal text-primary-foreground">
                      Applications
                    </p>
                  </div>
                  <div className="ml-auto w-fit text-right">
                    <p className="mt-4 font-poppins text-[45px] font-extrabold leading-normal text-primary-foreground">
                      Become A
                    </p>
                    <p className="font-poppins text-[45px] font-extrabold leading-normal text-primary-foreground">
                      System
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="brand-stage">
            <AuthApplo
              state={applo}
              size={260}
              coverLevel={coverLevel}
              coverShow={coverLevel > 0 ? 1 : 0}
              className="brand-applo"
            />
            <div className="brand-speech">{speech}</div>
            <div className="brand-tagline">{tagline}</div>
          </div>
        </aside>

        {/* ---------- form pane ---------- */}
        <main className="form-pane">
          <div className="form-card">
            <div className="form-mobilebrand">
              <div className="brand-lockup">
                <AppLogo className="aa-logo" />
              </div>
            </div>

            <div className="form-anim" key={isLogin ? 'login' : 'register'}>
              {isLogin ? (
                /* ===================== LOGIN ===================== */
                <>
                  <div className="form-head">
                    <h1 className="form-title">Willkommen zurück</h1>
                    <p className="form-sub">Melde dich an, um deine Bewerbungen weiterzuführen.</p>
                  </div>
                  <form className="form" onSubmit={loginForm.handleSubmit(onLoginSubmit, pulseError)} noValidate>
                    <Controller
                      control={loginForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field label="E-Mail" error={fieldState.error?.message}>
                          <input
                            className={`input${fieldState.error ? ' invalid' : ''}`}
                            type="email"
                            placeholder="deine@mail.de"
                            autoComplete="email"
                            {...field}
                            onFocus={() => setFocused('email')}
                            onBlur={() => {
                              field.onBlur();
                              setFocused(null);
                            }}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      control={loginForm.control}
                      name="password"
                      render={({ field, fieldState }) => (
                        <Field
                          label="Passwort"
                          error={fieldState.error?.message}
                          action={
                            <button
                              type="button"
                              className="link"
                              style={{ fontSize: 12.5 }}
                              onClick={() => router.push('/forgot-password')}
                            >
                              Passwort vergessen?
                            </button>
                          }
                        >
                          <div className="input-wrap">
                            <input
                              className={`input has-icon${fieldState.error ? ' invalid' : ''}`}
                              type={show.pw ? 'text' : 'password'}
                              placeholder="Dein Passwort"
                              autoComplete="current-password"
                              {...field}
                              onFocus={() => setFocused('password')}
                              onBlur={() => {
                                field.onBlur();
                                setFocused(null);
                              }}
                            />
                            <button
                              type="button"
                              className="reveal"
                              onClick={() => setShow((s) => ({ ...s, pw: !s.pw }))}
                              onMouseDown={(e) => e.preventDefault()}
                              aria-label={show.pw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                              title={show.pw ? 'Verbergen — Applo schaut weg' : 'Anzeigen — Applo linst'}
                            >
                              {show.pw ? <IcEyeOff /> : <IcEye />}
                            </button>
                          </div>
                        </Field>
                      )}
                    />

                    <button className="btn-submit" disabled={busy}>
                      {busy ? (
                        <>
                          <span className="spinner" />
                          Wird angemeldet …
                        </>
                      ) : (
                        'Anmelden'
                      )}
                    </button>

                    <div className="divider">Oder anmelden mit</div>
                    <div className="social">
                      <button type="button" onClick={() => (window.location.href = api.auth.googleLoginUrl())}>
                        <IcGoogle />
                        Google
                      </button>
                      <button type="button" onClick={() => (window.location.href = api.auth.microsoftLoginUrl())}>
                        <IcMicrosoft />
                        Microsoft
                      </button>
                    </div>

                    <p className="form-foot">
                      Noch kein Konto?{' '}
                      <button type="button" className="link" onClick={() => switchMode(false)}>
                        Registrieren
                      </button>
                    </p>
                  </form>
                </>
              ) : (
                /* ===================== REGISTER ===================== */
                <>
                  <div className="form-head">
                    <h1 className="form-title">Konto erstellen</h1>
                    <p className="form-sub">Starte mit Applo und behalte jede Bewerbung im Griff.</p>
                  </div>
                  <form className="form" onSubmit={registerForm.handleSubmit(onRegisterSubmit, pulseError)} noValidate>
                    <div className="row2">
                      <Controller
                        control={registerForm.control}
                        name="firstName"
                        render={({ field, fieldState }) => (
                          <Field label="Vorname" error={fieldState.error?.message}>
                            <input
                              className={`input${fieldState.error ? ' invalid' : ''}`}
                              placeholder="Dein Vorname"
                              autoComplete="given-name"
                              {...field}
                              onFocus={() => setFocused('firstName')}
                              onBlur={() => {
                                field.onBlur();
                                setFocused(null);
                              }}
                            />
                          </Field>
                        )}
                      />
                      <Controller
                        control={registerForm.control}
                        name="lastName"
                        render={({ field, fieldState }) => (
                          <Field label="Nachname" error={fieldState.error?.message}>
                            <input
                              className={`input${fieldState.error ? ' invalid' : ''}`}
                              placeholder="Dein Nachname"
                              autoComplete="family-name"
                              {...field}
                              onFocus={() => setFocused('lastName')}
                              onBlur={() => {
                                field.onBlur();
                                setFocused(null);
                              }}
                            />
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      control={registerForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field label="E-Mail" error={fieldState.error?.message}>
                          <input
                            className={`input${fieldState.error ? ' invalid' : ''}`}
                            type="email"
                            placeholder="deine@mail.de"
                            autoComplete="email"
                            {...field}
                            onFocus={() => setFocused('email')}
                            onBlur={() => {
                              field.onBlur();
                              setFocused(null);
                            }}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      control={registerForm.control}
                      name="password"
                      render={({ field, fieldState }) => (
                        <Field label="Passwort" error={fieldState.error?.message}>
                          <div className="input-wrap">
                            <input
                              className={`input has-icon${fieldState.error ? ' invalid' : ''}`}
                              type={show.pw ? 'text' : 'password'}
                              placeholder="Mindestens 8 Zeichen"
                              autoComplete="new-password"
                              {...field}
                              onFocus={() => setFocused('password')}
                              onBlur={() => {
                                field.onBlur();
                                setFocused(null);
                              }}
                            />
                            <button
                              type="button"
                              className="reveal"
                              onClick={() => setShow((s) => ({ ...s, pw: !s.pw }))}
                              onMouseDown={(e) => e.preventDefault()}
                              aria-label={show.pw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                              title={show.pw ? 'Verbergen — Applo schaut weg' : 'Anzeigen — Applo linst'}
                            >
                              {show.pw ? <IcEyeOff /> : <IcEye />}
                            </button>
                          </div>
                          {registerPassword && (
                            <div className="strength">
                              <div className="strength-bars">
                                {[1, 2, 3, 4].map((i) => (
                                  <i
                                    key={i}
                                    style={{ background: i <= pwScore ? STRENGTH[pwScore].color : 'var(--aa-border)' }}
                                  />
                                ))}
                              </div>
                              <div className="strength-row">
                                <span className="strength-label" style={{ color: STRENGTH[pwScore].color }}>
                                  {STRENGTH[pwScore].label}
                                </span>
                                <span style={{ color: 'var(--aa-muted)' }}>
                                  Groß-/Kleinbuchstaben, Zahl &amp; Symbol
                                </span>
                              </div>
                            </div>
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field, fieldState }) => (
                        <Field label="Passwort wiederholen" error={fieldState.error?.message}>
                          <div className="input-wrap">
                            <input
                              className={`input has-icon${fieldState.error ? ' invalid' : ''}`}
                              type={show.pw2 ? 'text' : 'password'}
                              placeholder="Passwort erneut eingeben"
                              autoComplete="new-password"
                              {...field}
                              onFocus={() => setFocused('confirmPassword')}
                              onBlur={() => {
                                field.onBlur();
                                setFocused(null);
                              }}
                            />
                            <button
                              type="button"
                              className="reveal"
                              onClick={() => setShow((s) => ({ ...s, pw2: !s.pw2 }))}
                              onMouseDown={(e) => e.preventDefault()}
                              aria-label={show.pw2 ? 'Passwort verbergen' : 'Passwort anzeigen'}
                              title={show.pw2 ? 'Verbergen — Applo schaut weg' : 'Anzeigen — Applo linst'}
                            >
                              {show.pw2 ? <IcEyeOff /> : <IcEye />}
                            </button>
                          </div>
                        </Field>
                      )}
                    />

                    {requireInviteCode && (
                      <Controller
                        control={registerForm.control}
                        name="inviteCode"
                        render={({ field, fieldState }) => (
                          <Field label="Einladungscode" error={fieldState.error?.message}>
                            <input
                              className={`input${fieldState.error ? ' invalid' : ''}`}
                              placeholder="BETA-XXXX-XXXX-XXXX"
                              autoComplete="off"
                              autoCapitalize="characters"
                              spellCheck={false}
                              style={{ letterSpacing: '.04em', fontFamily: 'ui-monospace, monospace' }}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              onFocus={() => setFocused('inviteCode')}
                              onBlur={() => {
                                field.onBlur();
                                setFocused(null);
                              }}
                            />
                          </Field>
                        )}
                      />
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="font-poppins text-base font-semibold text-foreground">
                        E-Mail
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Deine E-Mail"
                          className={`h-9 rounded-xl border-2 bg-transparent px-4 text-[14px] placeholder:text-muted-foreground focus:border-primary ${
                            fieldState.error
                              ? 'border-red-500 focus:border-red-500'
                              : fieldState.isDirty && !fieldState.invalid
                              ? 'border-green-500'
                              : 'border-input'
                          }`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="font-poppins text-base font-semibold text-foreground">
                        Passwort
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Dein Passwort"
                          className={`h-9 rounded-xl border-2 bg-transparent px-4 text-[14px] placeholder:text-muted-foreground focus:border-primary ${
                            fieldState.error
                              ? 'border-red-500 focus:border-red-500'
                              : fieldState.isDirty && !fieldState.invalid
                              ? 'border-green-500'
                              : 'border-input'
                          }`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <PasswordStrength password={field.value} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="font-poppins text-base font-semibold text-foreground">
                        Passwort wiederholen
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Dein Passwort"
                          className={`h-9 rounded-xl border-2 bg-transparent px-4 text-[14px] placeholder:text-muted-foreground focus:border-primary ${
                            fieldState.error
                              ? 'border-red-500 focus:border-red-500'
                              : fieldState.isDirty && !fieldState.invalid
                              ? 'border-green-500'
                              : 'border-input'
                          }`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Closed-beta invite-code gate. Only rendered when the
                    backend has REQUIRE_INVITE_CODES=true; the
                    useAuthConfig hook caches the answer for 10 min so
                    the field doesn't flicker between page loads. The
                    gate is enforced server-side regardless \u2014 the field
                    is just UX. */}
                {requireInviteCode && (
                  <FormField
                    control={registerForm.control}
                    name="inviteCode"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="font-poppins text-base font-semibold text-foreground">
                          Einladungscode
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="BETA-XXXX-XXXX-XXXX"
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            className={`h-9 rounded-xl border-2 bg-transparent px-4 font-mono text-[14px] tracking-wider placeholder:text-muted-foreground focus:border-primary ${
                              fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : fieldState.isDirty && !fieldState.invalid
                                ? 'border-green-500'
                                : 'border-input'
                            }`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="mt-1 font-poppins text-xs text-muted-foreground">
                          Applo ist gerade in der geschlossenen Beta. Du brauchst einen Einladungscode, um dich zu registrieren.
                        </p>
                      </FormItem>
                    )}

                    {/* Cloudflare Turnstile — renders nothing in dev without a site key. */}
                    <TurnstileWidget onToken={setTurnstileToken} />

                    <button className="btn-submit" disabled={busy}>
                      {busy ? (
                        <>
                          <span className="spinner" />
                          Konto wird erstellt …
                        </>
                      ) : (
                        'Registrieren'
                      )}
                    </button>

                    <div className="divider">Oder registrieren mit</div>
                    <div className="social">
                      <button type="button" onClick={() => (window.location.href = api.auth.googleLoginUrl())}>
                        <IcGoogle />
                        Google
                      </button>
                      <button type="button" onClick={() => (window.location.href = api.auth.microsoftLoginUrl())}>
                        <IcMicrosoft />
                        Microsoft
                      </button>
                    </div>

                    <p className="form-foot">
                      Bereits ein Konto?{' '}
                      <button type="button" className="link" onClick={() => switchMode(true)}>
                        Anmelden
                      </button>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
