/**
 * Regression test for the bundled OFL font families (TEMPLATE_CUSTOMIZATION
 * §3.4): `meta.fontFamily` swaps a template onto Lato / Source Sans 3 /
 * Merriweather, output stays text-extractable (pdf-parse = ATS proxy), and
 * unknown/absent choices keep the design's built-in faces. Uses
 * `loadReactPdf()` (not the static import) because font registration happens
 * inside the loader.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { createElement } from 'react';
import {
  isFontFamilyRegistered,
  registerBundledFonts,
  type ReactPdfNamespace,
} from '../react-pdf-loader';
import { resolveFontFamily, resolveFontStack } from '../design-tokens';
import { ClassicAtsFactory } from './classic-ats';
import { HarvardClassicFactory } from './harvard-classic';
import { ElegantSidebarFactory } from './elegant-sidebar';
import { ModernTwoColumnFactory } from './modern-two-column';
import { MinimalSingleColumnFactory } from './minimal-single-column';
import { ExecutiveSerifFactory } from './executive-serif';
import type { ResumeTemplateData } from '../template-data';
import type { ReactPdfTemplateFactory } from '../types';

const data: ResumeTemplateData = {
  candidateName: 'Anna Beispiel',
  email: 'anna@example.com',
  summary: '<p>Erfahrene <strong>Vertriebsleiterin</strong> mit <em>nachweisbaren</em> Erfolgen.</p>',
  skillCategories: [{ type: 'Kernkompetenzen', skills: ['Key-Account-Management', 'CRM'] }],
  experiences: [
    {
      title: 'Vertriebsleiterin',
      company: 'ACME GmbH',
      dateRange: '2019 – Heute',
      achievements: ['Umsatzsteigerung um 30 % in zwei Jahren.'],
    },
  ],
  education: [{ degree: 'B.A. BWL', institution: 'Uni Köln', year: '2014' }],
  language: 'de',
};

const FACTORIES: [string, ReactPdfTemplateFactory][] = [
  ['classic-ats', ClassicAtsFactory],
  ['harvard-classic', HarvardClassicFactory],
  ['elegant-sidebar', ElegantSidebarFactory],
  ['modern-two-column', ModernTwoColumnFactory],
  ['minimal-single-column', MinimalSingleColumnFactory],
  ['executive-serif', ExecutiveSerifFactory],
];

// Specs import @react-pdf/renderer statically (the loader's eval-based
// dynamic import is unavailable under vitest) and register the bundled
// families directly against that namespace.
const rp = ReactPdf as unknown as ReactPdfNamespace;

beforeAll(() => {
  registerBundledFonts(rp);
});

async function render(factory: ReactPdfTemplateFactory, fontFamily?: string) {
  const Resume = factory.resume!(rp);
  const buf = await rp.renderToBuffer(
    createElement(Resume, { data, meta: { language: 'de', fontFamily } }),
  );
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const parsed = await parser.getText();
  await parser.destroy();
  return { size: buf.length, text: parsed.text.toLowerCase() };
}

describe('bundled font registration', () => {
  it('registers all three OFL families via the loader', () => {
    expect(isFontFamilyRegistered('Lato')).toBe(true);
    expect(isFontFamilyRegistered('Source Sans 3')).toBe(true);
    expect(isFontFamilyRegistered('Merriweather')).toBe(true);
  });

  it('resolveFontFamily maps curated names and rejects unknown/default', () => {
    expect(resolveFontFamily('lato')).toBe('Lato');
    expect(resolveFontFamily('source-sans')).toBe('Source Sans 3');
    expect(resolveFontFamily('merriweather')).toBe('Merriweather');
    expect(resolveFontFamily('default')).toBeUndefined();
    expect(resolveFontFamily('comic-sans')).toBeUndefined();
    expect(resolveFontFamily(undefined)).toBeUndefined();
  });

  it('resolveFontStack falls back to the built-in faces for default', () => {
    const stack = resolveFontStack(undefined, {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique',
    });
    expect(stack.regular).toEqual({ fontFamily: 'Helvetica' });
    expect(stack.bold).toEqual({ fontFamily: 'Helvetica-Bold' });

    const lato = resolveFontStack('lato', {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique',
    });
    expect(lato.regular).toEqual({ fontFamily: 'Lato' });
    expect(lato.bold).toEqual({ fontFamily: 'Lato', fontWeight: 700 });
    expect(lato.italic).toEqual({ fontFamily: 'Lato', fontStyle: 'italic' });
  });
});

describe('react-pdf templates — bundled font rendering', () => {
  for (const [key, factory] of FACTORIES) {
    it(`${key} renders with each bundled family, text stays extractable`, async () => {
      for (const fontFamily of ['lato', 'source-sans', 'merriweather']) {
        const { text, size } = await render(factory, fontFamily);
        expect(text).toContain('anna beispiel');
        expect(text).toContain('vertriebsleiterin');
        // Embedded subset fonts are markedly larger than built-in-face PDFs.
        expect(size).toBeGreaterThan(8000);
      }
    }, 60_000);

    it(`${key} falls back to built-in faces for unknown fontFamily`, async () => {
      const withUnknown = await render(factory, 'papyrus');
      const withDefault = await render(factory, undefined);
      expect(withUnknown.text).toContain('anna beispiel');
      // Same faces → nearly identical output size (no embedded font tables).
      expect(Math.abs(withUnknown.size - withDefault.size)).toBeLessThan(200);
    }, 60_000);
  }
});
