/**
 * Regression test for the per-application design settings (TemplateSettings):
 * every template must render successfully at the extreme fontScale × density
 * combinations, keep its text extractable (pdf-parse = ATS proxy), and honor
 * the free accentColor override without layout breakage. Absent settings must
 * render exactly like before (identity factors).
 */
import { describe, it, expect } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { createElement } from 'react';
import { ClassicAtsFactory } from './classic-ats';
import { HarvardClassicFactory } from './harvard-classic';
import { ElegantSidebarFactory } from './elegant-sidebar';
import { ModernTwoColumnFactory } from './modern-two-column';
import { MinimalSingleColumnFactory } from './minimal-single-column';
import { ExecutiveSerifFactory } from './executive-serif';
import type { ResumeTemplateData } from '../template-data';
import type { ReactPdfTemplateFactory, ReactPdfTemplateMeta } from '../types';

const data: ResumeTemplateData = {
  candidateName: 'Anna Beispiel',
  email: 'anna@example.com',
  phone: '+49 30 1234567',
  summary: 'Erfahrene Pflegefachkraft mit Stationsleitung und Qualitätsmanagement.',
  skillCategories: [
    { type: 'Fachlich', skills: ['Wundversorgung', 'Medikamentenmanagement', 'Dokumentation'] },
    { type: 'Methoden', skills: ['Qualitätsmanagement', 'Dienstplanung'] },
  ],
  experiences: [
    {
      title: 'Stationsleitung',
      company: 'Klinikum Mitte',
      dateRange: '2020 – Heute',
      achievements: [
        'Leitung eines Teams von 18 Pflegekräften über drei Schichten.',
        'Reduktion der Dokumentationszeit um 25 % durch neue Standards.',
        'Einführung eines strukturierten Onboardings für neue Kolleg:innen.',
      ],
    },
    {
      title: 'Gesundheits- und Krankenpflegerin',
      company: 'St.-Marien-Krankenhaus',
      dateRange: '2014 – 2020',
      achievements: [
        'Betreuung von bis zu 24 Patient:innen pro Schicht.',
        'Mentorin für Auszubildende im dritten Lehrjahr.',
      ],
    },
  ],
  education: [{ degree: 'B.Sc. Pflegewissenschaft', institution: 'HS Berlin', year: '2014' }],
  projects: [{ name: 'Digitale Pflegedokumentation', description: 'Projektleitung Rollout.' }],
  languages: [{ name: 'Deutsch', level: 'Muttersprache' }],
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

async function render(factory: ReactPdfTemplateFactory, meta: ReactPdfTemplateMeta) {
  const Resume = factory.resume!(ReactPdf);
  const buf = await ReactPdf.renderToBuffer(createElement(Resume, { data, meta }));
  const parsed = await new PDFParse({ data: new Uint8Array(buf) }).getText();
  return { size: buf.length, text: parsed.text.toLowerCase() };
}

describe('react-pdf templates — design settings (fontScale × density × accent)', () => {
  for (const [key, factory] of FACTORIES) {
    it(`${key} renders at lg/compact with all sections extractable`, async () => {
      const { text } = await render(factory, {
        language: 'de',
        fontScale: 'lg',
        density: 'compact',
      });
      expect(text).toContain('anna beispiel');
      expect(text).toContain('stationsleitung');
      expect(text).toContain('wundversorgung');
      expect(text).toContain('pflegewissenschaft');
    }, 30_000);

    it(`${key} renders at sm/relaxed with a free accent override`, async () => {
      const { text, size } = await render(factory, {
        language: 'de',
        fontScale: 'sm',
        density: 'relaxed',
        accentColor: '#0d9488',
      });
      expect(size).toBeGreaterThan(1000);
      expect(text).toContain('anna beispiel');
    }, 30_000);

    it(`${key} ignores unknown settings values (defensive identity)`, async () => {
      const { text } = await render(factory, {
        language: 'de',
        fontScale: 'gigantic',
        density: 'airy',
      });
      expect(text).toContain('anna beispiel');
    }, 30_000);
  }
});

describe('react-pdf templates — Bewerbungsfoto (meta.photoUrl)', () => {
  // Generate a real portrait JPEG at runtime (no fixture file needed).
  async function makePhotoDataUri(): Promise<string> {
    const { createCanvas } = await import('@napi-rs/canvas');
    const canvas = createCanvas(90, 120);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8899aa';
    ctx.fillRect(0, 0, 90, 120);
    return `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg').toString('base64')}`;
  }

  for (const [key, factory] of FACTORIES) {
    it(`${key} renders with a photo and stays text-extractable`, async () => {
      const photoUrl = await makePhotoDataUri();
      const withPhoto = await render(factory, { language: 'de', photoUrl });
      const withoutPhoto = await render(factory, { language: 'de' });
      expect(withPhoto.text).toContain('anna beispiel');
      expect(withPhoto.text).toContain('stationsleitung');
      // The embedded image makes the PDF measurably larger.
      expect(withPhoto.size).toBeGreaterThan(withoutPhoto.size + 500);
    }, 30_000);
  }
});
