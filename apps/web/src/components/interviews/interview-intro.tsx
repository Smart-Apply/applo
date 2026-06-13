'use client';

/* ============================================================
   InterviewIntro — first-time experience for the Interview Coach.
   Replaces the empty "0 / —" stat cards + bare empty state with a
   guided 3-step tutorial (Modus wählen → Fragen beantworten →
   KI-Feedback) that previews the real product, fronted by Applo.
   Finishing or skipping calls onStart() (opens StartInterviewDialog).
   Designed to fit one viewport without scrolling.
   ============================================================ */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Applo, type ApploState } from './applo';
import {
  MessageSquare,
  Briefcase,
  Sparkles,
  Check,
  ArrowLeft,
  ArrowRight,
  Play,
  Lightbulb,
  Send,
  User,
} from 'lucide-react';

/* ---------- step previews (mirror the real product) ---------- */

function ModePreview() {
  return (
    <div className="w-full max-w-[460px] rounded-2xl border bg-card p-5 shadow-soft">
      <div className="mb-3.5 flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-blue-600" /> Zwei Modi
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border-[1.5px] border-primary p-3.5 ring-2 ring-primary/15">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-bold">Freies Interview</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Übe für eine beliebige Position.</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border-[1.5px] p-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-bold">Basierend auf Bewerbung</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Fragen zu einer echten Stelle.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="w-full max-w-[460px] rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-3.5 flex gap-2.5">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="rounded-xl border bg-muted px-3 py-2.5">
          <span className="mb-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Verhalten
          </span>
          <p className="text-xs leading-relaxed text-foreground/80">
            Beschreiben Sie ein Projekt, bei dem Sie eng mit Kund:innen zusammengearbeitet haben. Wie sind
            Sie vorgegangen?
          </p>
        </div>
      </div>
      <div className="mb-3.5 flex justify-end gap-2.5">
        <div className="max-w-[72%] rounded-xl bg-primary px-3 py-2 text-xs text-primary-foreground">
          In meinem letzten Werkstudenten-Projekt habe ich …
        </div>
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border py-1.5 pl-3 pr-1.5">
        <span className="flex-1 text-xs text-muted-foreground">Deine Antwort eingeben …</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <Send className="h-3.5 w-3.5" /> Senden
        </span>
      </div>
    </div>
  );
}

function FeedbackPreview() {
  return (
    <div className="w-full max-w-[460px] rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex gap-2.5">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="flex-1 rounded-xl border bg-muted p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="text-sm font-bold">Feedback zu deiner Antwort</span>
            <span className="ml-auto rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-extrabold text-green-700">
              82/100
            </span>
          </div>
          <p className="mt-2 flex gap-2 text-xs leading-snug text-foreground/80">
            <span className="flex-none font-bold text-green-700">Stärke:</span>
            <span>Klare STAR-Struktur und ein konkretes Beispiel mit messbarem Ergebnis.</span>
          </p>
          <p className="mt-2 flex gap-2 text-xs leading-snug text-foreground/80">
            <span className="flex-none font-bold text-blue-600">Tipp:</span>
            <span>Nenne zum Schluss, was du daraus gelernt hast — das rundet die Antwort ab.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- step content ---------- */

interface Step {
  pose: ApploState;
  heading: string;
  lead: string;
  bullets: [string, string][];
  preview: React.ReactNode;
}

const STEPS: Step[] = [
  {
    pose: 'wave',
    heading: 'Wähle deinen Modus',
    lead: 'Übe frei für eine beliebige Position — oder lass dir Fragen direkt aus einer deiner Bewerbungen generieren.',
    bullets: [
      ['Freies Interview', 'volle Kontrolle über Position, Unternehmen & Branche.'],
      ['Basierend auf Bewerbung', 'Fragen aus der echten Stellenanzeige.'],
    ],
    preview: <ModePreview />,
  },
  {
    pose: 'think',
    heading: 'Beantworte die Fragen',
    lead: 'Applo stellt dir realistische Fragen. Du antwortest im Chat — in deinem Tempo, mit Pause oder Wiederholung jederzeit.',
    bullets: [
      ['Eine Frage nach der anderen', 'kein Stress, kein Zeitdruck.'],
      ['STAR-Methode', 'Situation · Aufgabe · Aktion · Resultat.'],
    ],
    preview: <ChatPreview />,
  },
  {
    pose: 'success',
    heading: 'Erhalte KI-Feedback',
    lead: 'Nach jeder Antwort bekommst du einen Score plus konkrete Stärken und Verbesserungs-Tipps — so wirst du mit jeder Runde besser.',
    bullets: [
      ['Score pro Antwort', 'sieh sofort, wo du stehst.'],
      ['Konkrete Tipps', 'umsetzbar statt Floskeln.'],
    ],
    preview: <FeedbackPreview />,
  },
];

interface InterviewIntroProps {
  /** Opens the StartInterviewDialog (the existing configuration modal). */
  onStart: () => void;
}

export function InterviewIntro({ onStart }: InterviewIntroProps) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex min-h-[calc(100svh-13rem)] flex-col">
      <div className="grid flex-1 items-center gap-10 lg:grid-cols-2">
        {/* text */}
        <div key={step} className="max-w-xl animate-fade-in">
          <Applo state={s.pose} size={84} className="-ml-2 mb-1" aria-hidden />
          <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            Schritt {step + 1} <span className="text-muted-foreground/60">von {STEPS.length}</span>
          </p>
          <h2 className="text-3xl font-bold leading-tight tracking-tight">{s.heading}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{s.lead}</p>
          <ul className="mt-5 space-y-3">
            {s.bullets.map(([title, desc]) => (
              <li key={title} className="flex items-start gap-3 text-sm leading-snug text-foreground/80">
                <span className="mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md bg-green-100 text-green-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span>
                  <b className="font-bold text-foreground">{title}:</b> {desc}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* preview */}
        <div key={`p-${step}`} className="flex animate-fade-in justify-center">
          {s.preview}
        </div>
      </div>

      {/* footer: skip · dots · back/next */}
      <div className="mt-6 grid grid-cols-3 items-center border-t pt-5">
        <div>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onStart}>
            Überspringen
          </Button>
        </div>
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2.5">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Button>
          )}
          {isLast ? (
            <Button onClick={onStart} className="gap-1.5">
              <Play className="h-4 w-4" /> Los geht&apos;s
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)} className="gap-1.5">
              Weiter <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* learnability footnote */}
      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5" />
        Tipp: Strukturiere jede Antwort mit der STAR-Methode — das hebt deinen Score spürbar.
      </p>
    </div>
  );
}
