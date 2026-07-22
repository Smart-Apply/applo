'use client';

import { useState } from 'react';
import { Loader2, Palette, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateTemplateSettings } from '@/hooks/use-applications';
import { cn } from '@/lib/utils';
import type {
  TemplateDensity,
  TemplateFontFamily,
  TemplateFontScale,
  TemplateSettings,
} from '@/types';

const FONT_SCALE_OPTIONS: { value: TemplateFontScale; label: string; hint: string }[] = [
  { value: 'sm', label: 'S', hint: 'Kleiner (−8 %)' },
  { value: 'md', label: 'M', hint: 'Original' },
  { value: 'lg', label: 'L', hint: 'Größer (+8 %)' },
];

const DENSITY_OPTIONS: { value: TemplateDensity; label: string; hint: string }[] = [
  { value: 'compact', label: 'Kompakt', hint: 'Engere Abstände — mehr Inhalt pro Seite' },
  { value: 'normal', label: 'Normal', hint: 'Original-Abstände des Designs' },
  { value: 'relaxed', label: 'Locker', hint: 'Großzügigere Abstände' },
];

const FONT_FAMILY_OPTIONS: { value: TemplateFontFamily; label: string }[] = [
  { value: 'default', label: 'Standard (Design-Schrift)' },
  { value: 'lato', label: 'Lato (serifenlos)' },
  { value: 'source-sans', label: 'Source Sans 3 (serifenlos)' },
  { value: 'merriweather', label: 'Merriweather (Serifen)' },
];

/** Curated accent presets — the same hues the template color variants use. */
const ACCENT_PRESETS = [
  { hex: '#1B2A49', name: 'Navy' },
  { hex: '#374151', name: 'Anthrazit' },
  { hex: '#A51C30', name: 'Karminrot' },
  { hex: '#0d9488', name: 'Petrol' },
  { hex: '#16a34a', name: 'Waldgrün' },
  { hex: '#8B5E3C', name: 'Braun' },
];

interface DesignSettingsPanelProps {
  applicationId: string;
  settings: TemplateSettings | null | undefined;
  /** The template variant's own accent — shown as the "reset" state. */
  templateAccent: string;
  disabled?: boolean;
}

/**
 * "Design" panel in the editor toolbar: per-application tuning of the export
 * templates (Schriftgröße, Dichte, Schriftfamilie, Akzentfarbe). Every change
 * PATCHes immediately (optimistic — the editor mimic reacts instantly); the
 * exported PDF is the authoritative rendering.
 */
export function DesignSettingsPanel({
  applicationId,
  settings,
  templateAccent,
  disabled,
}: DesignSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  // Native color inputs fire change continuously while dragging — buffer the
  // value locally and PATCH once on blur (picker closed).
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const updateSettings = useUpdateTemplateSettings(applicationId);

  const fontScale = settings?.fontScale ?? 'md';
  const density = settings?.density ?? 'normal';
  const fontFamily = settings?.fontFamily ?? 'default';
  const accentOverride = settings?.accentColor ?? null;

  const isBusy = updateSettings.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-8 rounded-none border-[#e0e0e0] bg-white px-3 text-xs text-[#1b2a49] hover:bg-[#f5f6f8]"
            >
              {isBusy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Palette className="mr-1.5 h-3.5 w-3.5" />
              )}
              Design
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Schriftgröße, Dichte, Schrift &amp; Akzentfarbe anpassen</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 rounded-none border-[#e0e0e0] p-4">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#1b2a49]">Design anpassen</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Wirkt auf die exportierten PDFs. Die Vorschau im Editor ist eine Näherung.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-[.05em] text-[#6b6969]">
              Schriftgröße
            </Label>
            <div className="flex items-center gap-1.5">
              {FONT_SCALE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.hint}
                  disabled={isBusy}
                  onClick={() => updateSettings.mutate({ fontScale: option.value })}
                  className={cn(
                    'inline-flex h-8 w-10 items-center justify-center border font-mono text-[12px] font-semibold transition-colors',
                    fontScale === option.value
                      ? 'border-[#1B2A49] bg-[#1B2A49] text-white'
                      : 'border-[#E0E0E0] bg-white text-[#6B6969] hover:bg-[#F5F6F8]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-[.05em] text-[#6b6969]">
              Dichte
            </Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.hint}
                  disabled={isBusy}
                  onClick={() => updateSettings.mutate({ density: option.value })}
                  className={cn(
                    'inline-flex h-8 items-center border px-2.5 font-mono text-[11px] font-semibold tracking-[.03em] transition-colors',
                    density === option.value
                      ? 'border-[#1B2A49] bg-[#1B2A49] text-white'
                      : 'border-[#E0E0E0] bg-white text-[#6B6969] hover:bg-[#F5F6F8]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-[.05em] text-[#6b6969]">
              Schrift
            </Label>
            <Select
              value={fontFamily}
              disabled={isBusy}
              onValueChange={(value) =>
                updateSettings.mutate({ fontFamily: value as TemplateFontFamily })
              }
            >
              <SelectTrigger className="h-8 w-full rounded-none border-[#e0e0e0] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {FONT_FAMILY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-[.05em] text-[#6b6969]">
                Akzentfarbe
              </Label>
              {accentOverride && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => updateSettings.mutate({ accentColor: null })}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5581c7] hover:underline"
                >
                  <RotateCcw className="h-3 w-3" /> Zurücksetzen
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  title={preset.name}
                  aria-label={`Akzentfarbe ${preset.name}`}
                  disabled={isBusy}
                  onClick={() => updateSettings.mutate({ accentColor: preset.hex })}
                  className={cn(
                    'h-7 w-7 border-2 transition-transform hover:scale-110',
                    (accentOverride ?? templateAccent).toLowerCase() === preset.hex.toLowerCase()
                      ? 'border-[#1B2A49]'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: preset.hex }}
                />
              ))}
              <label
                className="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed border-[#B0B0B0] bg-white text-[10px] font-bold text-[#6B6969] hover:bg-[#F5F6F8]"
                title="Eigene Farbe wählen"
              >
                +
                <input
                  type="color"
                  value={draftColor ?? accentOverride ?? templateAccent}
                  disabled={isBusy}
                  onChange={(event) => setDraftColor(event.target.value)}
                  onBlur={() => {
                    if (draftColor && draftColor !== (accentOverride ?? templateAccent)) {
                      updateSettings.mutate({ accentColor: draftColor });
                    }
                    setDraftColor(null);
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Eigene Akzentfarbe wählen"
                />
              </label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
