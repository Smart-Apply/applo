'use client';

import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ExportLanguage = 'de' | 'en';

interface LanguageOption {
  value: ExportLanguage;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

/** Narrow any stored language code to a supported export language. */
export function toExportLanguage(value?: string | null): ExportLanguage {
  return value === 'en' ? 'en' : 'de';
}

interface LanguageSelectorProps {
  /** Current export language ('de' | 'en'). */
  value: ExportLanguage;
  /** Called when the user picks a different export language. */
  onChange: (value: ExportLanguage) => void;
  /** Disable while an export is running. */
  disabled?: boolean;
}

/**
 * Export Language Selector
 *
 * Picks the language the PDFs are exported in. Content generated in the
 * other language is translated automatically at export time (dates and
 * section headers deterministically, prose via the guarded translation
 * pass) — the editor content itself always stays in its source language.
 */
export function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(toExportLanguage(next))}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label="Exportsprache"
        className="h-8 w-auto gap-1.5 rounded-none border-border/50 bg-muted/30 px-3 text-xs"
      >
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((language) => (
          <SelectItem key={language.value} value={language.value} className="text-xs">
            <span className="mr-1.5">{language.flag}</span>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
