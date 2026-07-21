'use client';

/**
 * editable-cover-letter.tsx — WYSIWYG cover-letter document + empty-state CTA.
 *
 * `EditableCoverLetter` renders one letter surface: a letterhead derived from the
 * résumé data (name/contact/date — display only, the export template renders its
 * own from those same fields) plus the existing Tiptap `CoverLetterEditor` in
 * `inline` mode as the editable body (salutation, paragraphs, closing, signature
 * all live in the stored HTML). `CoverLetterCTA` is the prominent empty state shown
 * when no cover letter exists yet.
 */

import { Mail, ArrowRight, Loader2, Target, Sparkles, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoverLetterEditor } from '@/components/applications/cover-letter-editor';

interface EditableCoverLetterProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  candidateName?: string;
  email?: string;
  phone?: string;
  /** City/country line for the letterhead (falls back to nothing). */
  location?: string;
  /** Pre-formatted date string, e.g. "8. Juni 2026". */
  date: string;
}

export function EditableCoverLetter({
  value,
  onChange,
  disabled,
  candidateName,
  email,
  phone,
  location,
  date,
}: EditableCoverLetterProps) {
  const contact = [location, email, phone].filter(Boolean).join(' · ');

  return (
    <div className="animate-in fade-in duration-300">
      <div className="ed-doc ed-letter">
        {candidateName && <div className="cl-name">{candidateName.toUpperCase()}</div>}
        {contact && <div className="cl-contact">{contact}</div>}
        <div className="cl-date">{date}</div>
        <CoverLetterEditor inline value={value} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

interface CoverLetterCTAProps {
  onGenerate: () => void;
  loading: boolean;
}

export function CoverLetterCTA({ onGenerate, loading }: CoverLetterCTAProps) {
  return (
    <div className="mx-auto max-w-[820px] animate-in fade-in duration-300">
      <div className="rounded-[4px] border border-dashed border-primary/30 bg-primary-soft/30 p-6 sm:p-7">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[3px] bg-primary text-primary-foreground">
            <Mail className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <div className="font-heading text-lg font-bold">Noch kein Anschreiben vorhanden</div>
            <p className="mt-1 max-w-[460px] text-sm leading-relaxed text-muted-foreground">
              Ein individuelles Anschreiben hebt deine Bewerbung hervor und steigert deine
              Antwortchance. Es wird auf Basis deines Profils und dieser Stelle erstellt – in
              ca. 20 Sekunden.
            </p>
          </div>
          <Button onClick={onGenerate} disabled={loading} size="lg" className="shrink-0">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird generiert…
              </>
            ) : (
              <>
                Anschreiben jetzt generieren <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-5">
          {[
            { icon: Target, label: 'Auf die Stelle zugeschnitten' },
            { icon: Sparkles, label: 'KI-gestützt formuliert' },
            { icon: Edit3, label: 'Voll editierbar nach Erstellung' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4 text-foreground" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
