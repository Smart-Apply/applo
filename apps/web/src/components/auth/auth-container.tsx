'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLogo } from '@/components/ui/app-logo';
import { api, resetAuthRedirectFlag } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthConfig } from '@/hooks/use-auth-config';
import { toast } from '@/lib/toast';
import { TwoFactorChallengeForm } from '@/components/two-factor';
import { TurnstileWidget, resetTurnstile } from '@/components/auth/turnstile-widget';
import { AuthApplo, type AuthApploState } from '@/components/auth/auth-applo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
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
const STRENGTH_COLORS = ['var(--aa-border)', '#DC2626', '#E0951A', '#40639C', '#16A34A'];
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
  const t = useTranslations('auth');
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
        t('login.oauthInviteRequiredToast'),
        { duration: 12000 },
      );
    } else if (message === 'authentication_failed') {
      toast.error(t('login.oauthFailedToast'));
    } else {
      toast.error(t('login.oauthGenericToast'));
    }
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, t]);

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
        toast.success(t('login.successToast'));
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      pulseError();
      const { ApiError, getErrorMessage } = await import('@/lib/errors');
      if (ApiError.isApiError(error)) {
        if (error.status === 401) {
          toast.error(t('login.invalidCredentialsToast'));
        } else if (error.status === 429) {
          toast.error(t('login.rateLimitToast'), { duration: 8000 });
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
    toast.success(t('login.successToast'));
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
      toast.error(t('register.captchaRequiredToast'), { duration: 8000 });
      return;
    }

    // Client-side guard for the invite-code gate (server is authoritative).
    if (requireInviteCode && !data.inviteCode?.trim()) {
      registerForm.setError('inviteCode', { type: 'manual', message: t('register.inviteCodeRequiredError') });
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
      toast.success(t('register.successToast'));
      router.push('/onboarding');
    } catch (error: unknown) {
      pulseError();
      const { ApiError, getErrorMessage } = await import('@/lib/errors');
      // Reset the widget so the user can solve a fresh challenge.
      resetTurnstile();
      setTurnstileToken(null);

      if (ApiError.isApiError(error)) {
        if (error.data?.code === 'CAPTCHA_FAILED') {
          toast.error(t('register.captchaFailedToast'), { duration: 10000 });
        } else if (error.data?.code === 'INVITE_CODE_REQUIRED') {
          registerForm.setError('inviteCode', { type: 'manual', message: t('register.inviteCodeRequiredError') });
          toast.error(t('register.inviteCodeRequiredToast'), { duration: 8000 });
        } else if (error.data?.code === 'INVITE_CODE_INVALID') {
          registerForm.setError('inviteCode', { type: 'manual', message: t('register.inviteCodeInvalidError') });
          toast.error(t('register.inviteCodeInvalidToast'));
        } else if (error.data?.code === 'INVITE_CODE_ALREADY_USED') {
          registerForm.setError('inviteCode', { type: 'manual', message: t('register.inviteCodeUsedError') });
          toast.error(t('register.inviteCodeUsedToast'));
        } else if (error.data?.code === 'INVITE_CODE_EXPIRED') {
          registerForm.setError('inviteCode', { type: 'manual', message: t('register.inviteCodeExpiredError') });
          toast.error(t('register.inviteCodeExpiredToast'));
        } else if (error.status === 400 || error.status === 409) {
          toast.error(t('register.emailExistsToast'));
        } else if (error.status === 429) {
          toast.error(t('register.rateLimitToast'), { duration: 8000 });
        } else {
          toast.error(getErrorMessage(error));
        }
      } else {
        toast.error(t('register.genericFailureToast'));
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
    t('mascot.squint0'),
    t('mascot.squint1'),
    t('mascot.squint2'),
    t('mascot.squint3'),
    t('mascot.squint4'),
  ][pwScore];
  const passwordStrengthLabel = [
    '',
    t('passwordStrength.weak'),
    t('passwordStrength.okay'),
    t('passwordStrength.good'),
    t('passwordStrength.strong'),
  ][pwScore];

  const speech = {
    idle: t('mascot.idle'),
    look: t('mascot.look'),
    cover: t('mascot.cover'),
    peek: t('mascot.peek'),
    squint: squintSpeech,
    load: t('mascot.load'),
    success: isLogin ? t('mascot.successLogin') : t('mascot.successRegister'),
    error: t('mascot.error'),
  }[applo];

  const tagline = isLogin ? t('mascot.loginTagline') : t('mascot.registerTagline');

  // 2FA challenge takes over the whole screen.
  if (show2FAChallenge && challengeToken) {
    return (
      <div className="applo-auth">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher variant="labeled" />
        </div>
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
    <div className="applo-auth">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher variant="labeled" />
      </div>
      <div className={`auth${isLogin ? '' : ' swapped'}`}>
        {/* ---------- brand pane ---------- */}
        <aside className="brand-pane">
          <div className="brand-top">
            <div className="brand-lockup">
              <AppLogo className="aa-logo" />
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
            <div className="brand-hint">{t('mascot.passwordHint')}</div>
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
                    <p className="form-eyebrow">{t('login.eyebrow')}</p>
                    <h1 className="form-title">{t('login.title')}</h1>
                    <p className="form-sub">{t('login.subtitle')}</p>
                  </div>
                  <form className="form" onSubmit={loginForm.handleSubmit(onLoginSubmit, pulseError)} noValidate>
                    <Controller
                      control={loginForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field label={t('login.emailLabel')} error={fieldState.error?.message}>
                          <input
                            className={`input${fieldState.error ? ' invalid' : ''}`}
                            type="email"
                            placeholder={t('login.emailPlaceholder')}
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
                          label={t('login.passwordLabel')}
                          error={fieldState.error?.message}
                          action={
                            <button
                              type="button"
                              className="link"
                              style={{ fontSize: 12.5 }}
                              onClick={() => router.push('/forgot-password')}
                            >
                              {t('login.forgotPassword')}
                            </button>
                          }
                        >
                          <div className="input-wrap">
                            <input
                              className={`input has-icon${fieldState.error ? ' invalid' : ''}`}
                              type={show.pw ? 'text' : 'password'}
                              placeholder={t('login.passwordPlaceholder')}
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
                              aria-label={show.pw ? t('login.hidePassword') : t('login.showPassword')}
                              title={show.pw ? t('login.hidePasswordTitle') : t('login.showPasswordTitle')}
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
                          {t('login.submitting')}
                        </>
                      ) : (
                        t('login.submit')
                      )}
                    </button>

                    <div className="divider">{t('login.socialDivider')}</div>
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
                      {t('login.noAccount')}{' '}
                      <button type="button" className="link" onClick={() => switchMode(false)}>
                        {t('login.registerLink')}
                      </button>
                    </p>
                  </form>
                </>
              ) : (
                /* ===================== REGISTER ===================== */
                <>
                  <div className="form-head">
                    <p className="form-eyebrow">{t('register.eyebrow')}</p>
                    <h1 className="form-title">{t('register.title')}</h1>
                    <p className="form-sub">{t('register.subtitle')}</p>
                  </div>
                  <form className="form" onSubmit={registerForm.handleSubmit(onRegisterSubmit, pulseError)} noValidate>
                    <div className="row2">
                      <Controller
                        control={registerForm.control}
                        name="firstName"
                        render={({ field, fieldState }) => (
                          <Field label={t('register.firstNameLabel')} error={fieldState.error?.message}>
                            <input
                              className={`input${fieldState.error ? ' invalid' : ''}`}
                              placeholder={t('register.firstNamePlaceholder')}
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
                          <Field label={t('register.lastNameLabel')} error={fieldState.error?.message}>
                            <input
                              className={`input${fieldState.error ? ' invalid' : ''}`}
                              placeholder={t('register.lastNamePlaceholder')}
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
                        <Field label={t('register.emailLabel')} error={fieldState.error?.message}>
                          <input
                            className={`input${fieldState.error ? ' invalid' : ''}`}
                            type="email"
                            placeholder={t('register.emailPlaceholder')}
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
                        <Field label={t('register.passwordLabel')} error={fieldState.error?.message}>
                          <div className="input-wrap">
                            <input
                              className={`input has-icon${fieldState.error ? ' invalid' : ''}`}
                              type={show.pw ? 'text' : 'password'}
                              placeholder={t('register.passwordPlaceholder')}
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
                              aria-label={show.pw ? t('login.hidePassword') : t('login.showPassword')}
                              title={show.pw ? t('login.hidePasswordTitle') : t('login.showPasswordTitle')}
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
                                    style={{ background: i <= pwScore ? STRENGTH_COLORS[pwScore] : 'var(--aa-border)' }}
                                  />
                                ))}
                              </div>
                              <div className="strength-row">
                                <span className="strength-label" style={{ color: STRENGTH_COLORS[pwScore] }}>
                                  {passwordStrengthLabel}
                                </span>
                                <span style={{ color: 'var(--aa-muted)' }}>
                                  {t('register.passwordRequirements')}
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
                        <Field label={t('register.confirmPasswordLabel')} error={fieldState.error?.message}>
                          <div className="input-wrap">
                            <input
                              className={`input has-icon${fieldState.error ? ' invalid' : ''}`}
                              type={show.pw2 ? 'text' : 'password'}
                              placeholder={t('register.confirmPasswordPlaceholder')}
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
                              aria-label={show.pw2 ? t('login.hidePassword') : t('login.showPassword')}
                              title={show.pw2 ? t('login.hidePasswordTitle') : t('login.showPasswordTitle')}
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
                          <Field label={t('register.inviteCodeLabel')} error={fieldState.error?.message}>
                            <input
                              className={`input input-mono${fieldState.error ? ' invalid' : ''}`}
                              placeholder="BETA-XXXX-XXXX-XXXX"
                              autoComplete="off"
                              autoCapitalize="characters"
                              spellCheck={false}
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

                    {requireInviteCode && (
                      <div className="beta-note">
                        <span className="beta-tag">{t('register.betaTag')}</span>
                        {t('register.betaNote')}
                      </div>
                    )}

                    {/* Cloudflare Turnstile — renders nothing in dev without a site key. */}
                    <TurnstileWidget onToken={setTurnstileToken} />

                    <button className="btn-submit" disabled={busy}>
                      {busy ? (
                        <>
                          <span className="spinner" />
                          {t('register.submitting')}
                        </>
                      ) : (
                        t('register.submit')
                      )}
                    </button>

                    <div className="divider">{t('register.socialDivider')}</div>
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
                      {t('register.hasAccount')}{' '}
                      <button type="button" className="link" onClick={() => switchMode(true)}>
                        {t('register.loginLink')}
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
