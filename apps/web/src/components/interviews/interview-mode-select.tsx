'use client';

import { Check, MessageSquare, Mic, ArrowRight, Clock } from 'lucide-react';
import { Applo } from './applo';

interface InterviewModeSelectProps {
  voiceAvailable: boolean;
  remainingMinutes?: number;
  onSelectText: () => void;
  onSelectVoice: () => void;
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm font-medium text-secondary">
      <Check className="h-4 w-4 shrink-0 text-success" />
      {children}
    </li>
  );
}

/**
 * Entry screen for an in-progress interview: lets the candidate pick how they
 * want to practice before diving in. Replaces the small pill toggle with two
 * large, descriptive mode cards. The mode can still be switched at any time
 * once inside (see the segmented control on the session page).
 */
export function InterviewModeSelect({
  voiceAvailable,
  remainingMinutes,
  onSelectText,
  onSelectVoice,
}: InterviewModeSelectProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Wie möchtest du üben?</h2>
        <p className="mt-1 max-w-xl text-[15px] text-muted-foreground">
          Wähle deinen Interview-Modus. Beide Varianten führen durch dieselben Fragen und enden mit
          einer vollständigen Auswertung{voiceAvailable ? ' — du kannst jederzeit wechseln.' : '.'}
        </p>
      </div>

      <div className={`grid gap-5 ${voiceAvailable ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        {/* Text-Chat */}
        <button
          type="button"
          onClick={onSelectText}
          className="group relative overflow-hidden rounded-[4px] border bg-card p-7 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30"
        >
          <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
            <MessageSquare className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-xl font-bold tracking-tight">Text-Chat</h3>
          <p className="mt-1.5 min-h-[44px] text-sm leading-relaxed text-muted-foreground">
            Schreibe deine Antworten in Ruhe und deinem eigenen Tempo — ideal zum Formulieren und
            Überarbeiten.
          </p>
          <ul className="mt-4 space-y-2.5">
            <Feature>Antworte ohne Zeitdruck</Feature>
            <Feature>Feedback nach jeder Frage</Feature>
            <Feature>Kein Mikrofon nötig</Feature>
          </ul>
          <span className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[3px] bg-primary text-[15px] font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
            Text-Chat starten
            <ArrowRight className="h-[18px] w-[18px]" />
          </span>
          <MessageSquare className="pointer-events-none absolute -bottom-6 -right-5 h-40 w-40 text-primary opacity-[0.04]" />
        </button>

        {/* Sprach-Interview */}
        {voiceAvailable && (
          <button
            type="button"
            onClick={onSelectVoice}
            className="group relative overflow-hidden rounded-[4px] border bg-card p-7 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
                <Mic className="h-7 w-7" />
              </span>
              <span className="rounded-[2px] border border-[#BFE9CC] bg-[#ECFAF0] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[.05em] text-success dark:border-green-400/30 dark:bg-green-400/10">
                Realistisch
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold tracking-tight">Sprach-Interview</h3>
            <p className="mt-1.5 min-h-[44px] text-sm leading-relaxed text-muted-foreground">
              Führe ein echtes Gespräch mit deinem KI-Interviewer. Sprich frei, wie im richtigen
              Interview.
            </p>
            <ul className="mt-4 space-y-2.5">
              <Feature>Natürliches Hin &amp; Her</Feature>
              <Feature>Übe Aussprache &amp; Souveränität</Feature>
              <Feature>
                Mikrofon erforderlich
                {typeof remainingMinutes === 'number' && remainingMinutes >= 0
                  ? ` · ${remainingMinutes} Min. verfügbar`
                  : ''}
              </Feature>
            </ul>
            <span className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[3px] border bg-card text-[15px] font-semibold text-primary transition-colors group-hover:border-primary group-hover:bg-muted">
              Sprach-Interview wählen
              <ArrowRight className="h-[18px] w-[18px]" />
            </span>
            <span className="pointer-events-none absolute -bottom-10 -right-8 opacity-[0.05]">
              <Applo state="wave" size={170} aria-hidden />
            </span>
          </button>
        )}
      </div>

      {voiceAvailable && typeof remainingMinutes === 'number' && remainingMinutes >= 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Verbleibendes Sprach-Kontingent: {remainingMinutes} Min.
        </p>
      )}
    </div>
  );
}
