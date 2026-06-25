'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/ui/app-logo';
import { api } from '@/lib/api-client';
import { AuthApplo, type AuthApploState } from '@/components/auth/auth-applo';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validation/schemas';
import '@/components/auth/auth.css';

function IcAlert() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await api.auth.forgotPassword(data);
    } catch {
      // Always show success to prevent email enumeration.
    } finally {
      setIsSubmitted(true);
    }
  };

  const submitting = form.formState.isSubmitting;
  let applo: AuthApploState = 'idle';
  if (isSubmitted) applo = 'success';
  else if (submitting) applo = 'load';
  else if (focused) applo = 'look';

  const speech = isSubmitted
    ? 'Schau in dein Postfach!'
    : focused
      ? 'Kein Problem — ich helf dir rein.'
      : 'Passwort vergessen? Passiert jedem.';

  return (
    <div className="applo-auth">
      <div className="auth">
        {/* ---------- brand pane ---------- */}
        <aside className="brand-pane">
          <div className="brand-top">
            <div className="brand-lockup">
              <AppLogo className="aa-logo" />
            </div>
          </div>
          <div className="brand-stage">
            <AuthApplo state={applo} size={260} className="brand-applo" />
            <div className="brand-speech">{speech}</div>
            <div className="brand-tagline">Kein Problem — wir bringen dich gleich wieder rein.</div>
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

            <div className="form-anim" key={isSubmitted ? 'sent' : 'form'}>
              {isSubmitted ? (
                <div className="success">
                  <h2>E-Mail gesendet</h2>
                  <p>
                    Falls ein Konto mit dieser E-Mail-Adresse existiert, erhältst du in Kürze einen Link zum
                    Zurücksetzen deines Passworts. Bitte überprüfe auch deinen Spam-Ordner.
                  </p>
                  <button type="button" className="btn-submit" onClick={() => router.push('/login')}>
                    Zurück zur Anmeldung
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-head">
                    <h1 className="form-title">Passwort zurücksetzen</h1>
                    <p className="form-sub">
                      Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.
                    </p>
                  </div>
                  <form className="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                    <Controller
                      control={form.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <div className="field">
                          <div className="field-label-row">
                            <label>E-Mail</label>
                          </div>
                          <input
                            className={`input${fieldState.error ? ' invalid' : ''}`}
                            type="email"
                            placeholder="deine@mail.de"
                            autoComplete="email"
                            {...field}
                            onFocus={() => setFocused(true)}
                            onBlur={() => {
                              field.onBlur();
                              setFocused(false);
                            }}
                          />
                          {fieldState.error && (
                            <div className="err">
                              <IcAlert />
                              {fieldState.error.message}
                            </div>
                          )}
                        </div>
                      )}
                    />

                    <button className="btn-submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner" />
                          Wird gesendet …
                        </>
                      ) : (
                        'Link senden'
                      )}
                    </button>

                    <p className="form-foot">
                      <button type="button" className="link" onClick={() => router.push('/login')}>
                        ← Zurück zum Login
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
