/**
 * Scale math for the per-application design settings. Pure functions — the
 * factors here are the contract every template relies on (bounded ±8% font,
 * bounded density) so page-break behavior stays predictable.
 */
import { describe, it, expect } from 'vitest';
import { normalizeTemplateSettings, resolveDesignTokens } from './design-tokens';

const FS = { sm: 10, base: 11, xl: 16 };
const SP = { xs: 2, lg: 12 };

describe('resolveDesignTokens', () => {
  it('returns identity tokens for absent meta (pre-existing applications)', () => {
    const t = resolveDesignTokens(undefined, FS, SP);
    expect(t.fs).toEqual(FS);
    expect(t.sp).toEqual(SP);
    expect(t.lineHeight(1.5)).toBe(1.5);
    expect(t.fontScaled(85)).toBe(85);
  });

  it('returns identity tokens for md/normal', () => {
    const t = resolveDesignTokens({ fontScale: 'md', density: 'normal' }, FS, SP);
    expect(t.fs).toEqual(FS);
    expect(t.sp).toEqual(SP);
  });

  it('scales fonts by ±8% and spacing by density', () => {
    const lg = resolveDesignTokens({ fontScale: 'lg', density: 'relaxed' }, FS, SP);
    expect(lg.fs.base).toBeCloseTo(11 * 1.08, 2);
    expect(lg.sp.lg).toBeCloseTo(12 * 1.15, 2);
    expect(lg.lineHeight(1.5)).toBeCloseTo(1.5 * 1.05, 2);

    const sm = resolveDesignTokens({ fontScale: 'sm', density: 'compact' }, FS, SP);
    expect(sm.fs.base).toBeCloseTo(11 * 0.92, 2);
    expect(sm.sp.lg).toBeCloseTo(12 * 0.85, 2);
    expect(sm.lineHeight(1.5)).toBeCloseTo(1.5 * 0.95, 2);
    expect(sm.fontScaled(85)).toBeCloseTo(85 * 0.92, 2);
  });

  it('treats unknown values as factor 1 (defensive against bad stored Json)', () => {
    const t = resolveDesignTokens({ fontScale: 'huge', density: 'dense' }, FS, SP);
    expect(t.fs).toEqual(FS);
    expect(t.sp).toEqual(SP);
    expect(t.lineHeight(1.7)).toBe(1.7);
  });
});

describe('normalizeTemplateSettings', () => {
  it('passes through valid settings', () => {
    expect(
      normalizeTemplateSettings({
        fontFamily: 'lato',
        fontScale: 'lg',
        density: 'compact',
        accentColor: '#1B2A49',
        showPhoto: false,
      }),
    ).toEqual({
      fontFamily: 'lato',
      fontScale: 'lg',
      density: 'compact',
      accentColor: '#1B2A49',
      showPhoto: false,
    });
  });

  it('drops out-of-enum and malformed values field by field', () => {
    expect(
      normalizeTemplateSettings({
        fontFamily: 'comic-sans',
        fontScale: 'xl',
        density: 'relaxed',
        accentColor: 'red; background:url(x)',
        showPhoto: 'yes',
      }),
    ).toEqual({ density: 'relaxed' });
  });

  it('returns undefined for empty, non-object, or fully-invalid input', () => {
    expect(normalizeTemplateSettings(null)).toBeUndefined();
    expect(normalizeTemplateSettings(undefined)).toBeUndefined();
    expect(normalizeTemplateSettings('lg')).toBeUndefined();
    expect(normalizeTemplateSettings([])).toBeUndefined();
    expect(normalizeTemplateSettings({})).toBeUndefined();
    expect(normalizeTemplateSettings({ fontScale: 'huge' })).toBeUndefined();
  });
});
