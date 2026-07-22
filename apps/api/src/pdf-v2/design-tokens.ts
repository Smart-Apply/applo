/**
 * Design tokens for per-application template tuning.
 *
 * The DB Template row defines the *design*; `Application.templateSettings`
 * defines the user's bounded *tuning* of it (font scale, density, accent
 * override, curated font family). This module owns the scale math so all
 * templates stay consistent: every knob is a bounded enum mapped to a fixed
 * factor — no free-form values, every combination testable and ATS-safe.
 *
 * Fonts note: the curated families (`lato`, `source-sans`, `merriweather`)
 * are OFL fonts bundled under apps/api/assets/fonts/ and registered by
 * `react-pdf-loader.ts` when the renderer loads. `resolveFontFamily` returns
 * a family only when its registration succeeded, so a missing assets folder
 * degrades to the design's built-in faces instead of crashing the render.
 */
import type { TemplateSettings } from '@applo/shared';
import { isFontFamilyRegistered } from './react-pdf-loader';

/** ±8% — bounded so `wrap={false}` page-break behavior stays scale-safe. */
const FONT_SCALE_FACTORS: Record<string, number> = {
  sm: 0.92,
  md: 1,
  lg: 1.08,
};

/** Vertical rhythm: spacing tokens scale harder than line height. */
const DENSITY_SPACING_FACTORS: Record<string, number> = {
  compact: 0.85,
  normal: 1,
  relaxed: 1.15,
};

const DENSITY_LINE_HEIGHT_FACTORS: Record<string, number> = {
  compact: 0.95,
  normal: 1,
  relaxed: 1.05,
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const FONT_FAMILIES = new Set(['default', 'lato', 'source-sans', 'merriweather']);

/**
 * Defensively narrow a stored/unknown `templateSettings` value (Prisma Json)
 * to the fields the renderer understands, dropping anything out-of-enum.
 * The PATCH DTO already validates on write — this is the read-side guard.
 */
export function normalizeTemplateSettings(value: unknown): TemplateSettings | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const settings: TemplateSettings = {};

  if (typeof raw.fontFamily === 'string' && FONT_FAMILIES.has(raw.fontFamily)) {
    settings.fontFamily = raw.fontFamily as TemplateSettings['fontFamily'];
  }
  if (typeof raw.fontScale === 'string' && raw.fontScale in FONT_SCALE_FACTORS) {
    settings.fontScale = raw.fontScale as TemplateSettings['fontScale'];
  }
  if (typeof raw.density === 'string' && raw.density in DENSITY_SPACING_FACTORS) {
    settings.density = raw.density as TemplateSettings['density'];
  }
  if (typeof raw.accentColor === 'string' && HEX_COLOR_RE.test(raw.accentColor)) {
    settings.accentColor = raw.accentColor;
  }
  if (typeof raw.showPhoto === 'boolean') {
    settings.showPhoto = raw.showPhoto;
  }

  return Object.keys(settings).length > 0 ? settings : undefined;
}

/** Multiply every numeric token in a table by `factor` (rounded to 2 decimals). */
function scaleTable<T extends Record<string, number>>(base: T, factor: number): T {
  if (factor === 1) return base;
  const scaled = {} as Record<string, number>;
  for (const [key, val] of Object.entries(base)) {
    scaled[key] = Math.round(val * factor * 100) / 100;
  }
  return scaled as T;
}

export interface ResolvedDesignTokens<
  F extends Record<string, number>,
  S extends Record<string, number>,
> {
  /** Font-size tokens, scaled by `meta.fontScale`. */
  fs: F;
  /** Spacing tokens, scaled by `meta.density`. */
  sp: S;
  /** Scale a base line-height by the density factor (e.g. `lineHeight(1.5)`). */
  lineHeight: (base: number) => number;
  /** Scale a one-off length that must track the font scale (e.g. header bars). */
  fontScaled: (value: number) => number;
}

/**
 * Resolve a template's base token tables against the per-application meta.
 * Unknown/absent values resolve to factor 1 — pre-existing applications and
 * catalog previews render pixel-identical to before.
 */
export function resolveDesignTokens<
  F extends Record<string, number>,
  S extends Record<string, number>,
>(
  meta: { fontScale?: string; density?: string } | undefined,
  fsBase: F,
  spBase: S,
): ResolvedDesignTokens<F, S> {
  const fontFactor = FONT_SCALE_FACTORS[meta?.fontScale ?? 'md'] ?? 1;
  const spacingFactor = DENSITY_SPACING_FACTORS[meta?.density ?? 'normal'] ?? 1;
  const lineHeightFactor = DENSITY_LINE_HEIGHT_FACTORS[meta?.density ?? 'normal'] ?? 1;

  return {
    fs: scaleTable(fsBase, fontFactor),
    sp: scaleTable(spBase, spacingFactor),
    lineHeight: (base: number) => Math.round(base * lineHeightFactor * 100) / 100,
    fontScaled: (value: number) => Math.round(value * fontFactor * 100) / 100,
  };
}

/** Curated choice → react-pdf family name (registered in react-pdf-loader.ts). */
const REGISTERED_FONT_FAMILIES: Record<string, string> = {
  lato: 'Lato',
  'source-sans': 'Source Sans 3',
  merriweather: 'Merriweather',
};

/**
 * Map a curated font-family choice to a registered react-pdf family name.
 * Returns `undefined` (keep the design default) for `default`, unknown
 * values, and families whose bundled TTFs failed to register — referencing
 * an unregistered family would make react-pdf throw at render time.
 */
export function resolveFontFamily(fontFamily?: string): string | undefined {
  if (!fontFamily || fontFamily === 'default') return undefined;
  const family = REGISTERED_FONT_FAMILIES[fontFamily];
  return family && isFontFamilyRegistered(family) ? family : undefined;
}

/**
 * Style fragments for the three text cuts a template needs. Built-in faces
 * are separate one-cut families (Helvetica vs Helvetica-Bold); bundled
 * families carry their cuts as weights/styles under ONE name — this stack
 * abstracts the difference so template styles just spread `...F.bold`.
 */
export interface FontStack {
  regular: { fontFamily: string };
  bold: { fontFamily: string; fontWeight?: number };
  italic: { fontFamily: string; fontStyle?: 'italic' };
}

/**
 * Resolve the per-application font choice against a template's built-in
 * fallback faces. `meta.fontFamily` absent/`default`/unregistered → the
 * design's original faces, byte-identical output.
 */
export function resolveFontStack(
  fontFamily: string | undefined,
  fallback: { regular: string; bold: string; italic: string },
): FontStack {
  const family = resolveFontFamily(fontFamily);
  if (!family) {
    return {
      regular: { fontFamily: fallback.regular },
      bold: { fontFamily: fallback.bold },
      italic: { fontFamily: fallback.italic },
    };
  }
  return {
    regular: { fontFamily: family },
    bold: { fontFamily: family, fontWeight: 700 },
    italic: { fontFamily: family, fontStyle: 'italic' },
  };
}
