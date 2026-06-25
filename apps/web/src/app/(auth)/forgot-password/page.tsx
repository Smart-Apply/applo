'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
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

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
        <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg border border-border">
          <div className="mb-6 flex justify-center">
            <AppLogo className="h-12 w-auto" />
          </div>

  const speech = isSubmitted
    ? 'Schau in dein Postfach!'
    : focused
      ? 'Kein Problem — ich helf dir rein.'
      : 'Passwort vergessen? Passiert jedem.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg border border-border">
        <div className="mb-6 flex justify-center">
          <AppLogo className="h-12 w-auto" />
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
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
