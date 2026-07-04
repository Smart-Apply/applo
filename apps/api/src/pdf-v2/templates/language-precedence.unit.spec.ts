import { describe, it, expect } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { HarvardClassicFactory } from './harvard-classic';
import { ClassicAtsFactory } from './classic-ats';
import { ElegantSidebarFactory } from './elegant-sidebar';
import type { ResumeTemplateData } from '../template-data';
import type { ReactPdfTemplateMeta } from '../types';
import { createElement } from 'react';

/**
 * Regression test for issue #536.
 *
 * The DB template row for these designs only ships in English
 * (`seed-multilingual-templates.ts` seeds one variant per design). When a
 * user picks "Harvard Classic + German" and exports, the export pipeline
 * resolves the template id to that English DB row, so `meta.language` is
 * `'en'`. The user's choice is carried by `data.language` (set by the
 * application processor from the export request).
 *
 * Before the fix, the resume templates picked `meta.language || data.language`,
 * so DB-meta won and section headings rendered in English even though the
 * LLM body was German. After the fix, `data.language` wins.
 *
 * We assert against the rendered PDF text via `pdf-parse` rather than the
 * React element tree so a future regression that bypasses `tLabel` (e.g.
 * hard-coding "Education") still trips the test. We call the factories
 * directly to bypass the `react-pdf-loader.ts` dynamic-import shim, which
 * doesn't work under Vitest's module transform.
 */
describe('react-pdf templates — language precedence (regression #536)', () => {
  const FACTORIES = [
    ['harvard-classic', HarvardClassicFactory],
    ['classic-ats', ClassicAtsFactory],
    ['elegant-sidebar', ElegantSidebarFactory],
  ] as const;

  // German labels from pdf-v2/i18n.ts that prove the German render path won.
  const GERMAN_HEADINGS = ['Berufserfahrung', 'Ausbildung', 'Fähigkeiten'];
  // English equivalents that must NOT appear when language='de'.
  const ENGLISH_HEADINGS = ['Professional Experience', 'Education', 'Skills'];

  const sampleData: ResumeTemplateData = {
    candidateName: 'Anna Beispiel',
    email: 'anna@example.com',
    phone: '+49 30 123456',
    summary: 'Erfahrene Fachkraft mit nachgewiesenen Erfolgen.',
    skillCategories: [{ type: 'Core', skills: ['Projektmanagement', 'Kommunikation'] }],
    experiences: [
      {
        title: 'Projektleiterin',
        company: 'ACME GmbH',
        location: 'Berlin',
        dateRange: 'Jan 2022 – Heute',
        achievements: ['Leitete ein Team von 5 Personen'],
      },
    ],
    education: [{ degree: 'M.Sc. Informatik', institution: 'TU Berlin', year: '2020' }],
    languages: [
      { name: 'Deutsch', level: 'level.native' },
      { name: 'Englisch', level: 'level.fluent' },
    ],
    language: 'de', // ← the user's export-time choice
  };

  // Simulate the missing-DE-variant fallback: DB-meta says English.
  const englishMeta: ReactPdfTemplateMeta = {
    language: 'en',
    accentColor: undefined,
    colorVariantName: undefined,
    atsOptimized: false,
  };

  for (const [name, factory] of FACTORIES) {
    it(`${name} renders German headings when data.language='de' overrides meta.language='en'`, async () => {
      const Resume = factory.resume(ReactPdf);
      const element = createElement(Resume, { data: sampleData, meta: englishMeta });
      const buf = await ReactPdf.renderToBuffer(element);
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const parsed = await parser.getText();
      // Templates apply `text-transform: uppercase` to section headings,
      // so compare in lower-case.
      const text = parsed.text.toLowerCase();

      for (const heading of GERMAN_HEADINGS) {
        expect(
          text,
          `${name} should contain German heading "${heading}"`,
        ).toContain(heading.toLowerCase());
      }
      for (const heading of ENGLISH_HEADINGS) {
        expect(
          text,
          `${name} should NOT contain English heading "${heading}"`,
        ).not.toContain(heading.toLowerCase());
      }

      // Regression: proficiency levels must render localized, never as raw keys.
      expect(
        text,
        `${name} should localize level.native to "Muttersprache"`,
      ).toContain('muttersprache');
      expect(
        text,
        `${name} should NOT leak the raw "level.native" i18n key`,
      ).not.toContain('level.native');
    }, 30_000);

    it(`${name} localizes proficiency levels in English when language='en'`, async () => {
      const Resume = factory.resume(ReactPdf);
      const element = createElement(Resume, {
        data: { ...sampleData, language: 'en' },
        meta: englishMeta,
      });
      const buf = await ReactPdf.renderToBuffer(element);
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const parsed = await parser.getText();
      const text = parsed.text.toLowerCase();

      expect(
        text,
        `${name} should localize level.native to "Native"`,
      ).toContain('native');
      expect(
        text,
        `${name} should NOT leak the raw "level.native" i18n key`,
      ).not.toContain('level.native');
      expect(
        text,
        `${name} should NOT show the German label in an English export`,
      ).not.toContain('muttersprache');
    }, 30_000);
  }
});
