/**
 * Regression test for the optional `data.sectionOrder` contract: the
 * editor's user-chosen section order must drive the exported PDF. Absent
 * (all pre-existing records) each template keeps its hardcoded default
 * order; unknown keys are dropped and omitted sections are appended so
 * content is never lost. elegant-sidebar applies the flat order within
 * each of its two columns.
 */
import { describe, it, expect } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { ClassicAtsFactory } from './classic-ats';
import { HarvardClassicFactory } from './harvard-classic';
import { ElegantSidebarFactory } from './elegant-sidebar';
import { ModernTwoColumnFactory } from './modern-two-column';
import { MinimalSingleColumnFactory } from './minimal-single-column';
import { ExecutiveSerifFactory } from './executive-serif';
import type { ResumeTemplateData } from '../template-data';
import type { ReactPdfTemplateMeta } from '../types';
import { createElement } from 'react';

const data: ResumeTemplateData = {
  candidateName: 'Anna Beispiel',
  email: 'anna@example.com',
  summary: 'Erfahrene Fachkraft.',
  skillCategories: [{ type: 'Core', skills: ['Projektmanagement'] }],
  experiences: [{ title: 'Projektleiterin', company: 'ACME', dateRange: '2022', achievements: ['X'] }],
  education: [{ degree: 'M.Sc.', institution: 'TU Berlin', year: '2020' }],
  projects: [{ name: 'Projekt Alpha' }],
  language: 'de',
};
const meta: ReactPdfTemplateMeta = {
  language: 'de',
  accentColor: undefined,
  colorVariantName: undefined,
  atsOptimized: false,
};

async function textOf(factory: typeof ClassicAtsFactory, d: ResumeTemplateData) {
  const Resume = factory.resume(ReactPdf);
  const buf = await ReactPdf.renderToBuffer(createElement(Resume, { data: d, meta }));
  const parsed = await new PDFParse({ data: new Uint8Array(buf) }).getText();
  return parsed.text.toLowerCase();
}

describe('react-pdf templates — sectionOrder', () => {
  it('classic-ats default keeps education before experience', async () => {
    const t = await textOf(ClassicAtsFactory, data);
    expect(t.indexOf('ausbildung')).toBeLessThan(t.indexOf('berufserfahrung'));
  }, 30_000);

  it('classic-ats honors a custom order', async () => {
    const t = await textOf(ClassicAtsFactory, {
      ...data,
      sectionOrder: ['projects', 'experience', 'profile', 'skills', 'education', 'languages', 'certs'],
    });
    expect(t.indexOf('wichtige projekte')).toBeLessThan(t.indexOf('berufserfahrung'));
    expect(t.indexOf('berufserfahrung')).toBeLessThan(t.indexOf('ausbildung'));
    expect(t).toContain('profil');
  }, 30_000);

  it('harvard honors a custom order and appends missing sections', async () => {
    const t = await textOf(HarvardClassicFactory, {
      ...data,
      sectionOrder: ['experience', 'projects'], // partial: others appended in default order
    });
    expect(t.indexOf('berufserfahrung')).toBeLessThan(t.indexOf('wichtige projekte'));
    expect(t.indexOf('wichtige projekte')).toBeLessThan(t.indexOf('profil'));
    expect(t).toContain('ausbildung');
    expect(t).toContain('fähigkeiten');
  }, 30_000);

  it('elegant-sidebar applies the order per column', async () => {
    const t = await textOf(ElegantSidebarFactory, {
      ...data,
      sectionOrder: ['skills', 'education', 'projects', 'experience', 'profile'],
    });
    expect(t.indexOf('fähigkeiten')).toBeLessThan(t.indexOf('ausbildung'));
    expect(t.indexOf('wichtige projekte')).toBeLessThan(t.indexOf('berufserfahrung'));
    expect(t).toContain('profil');
  }, 30_000);

  it('modern-two-column applies the order per column', async () => {
    const t = await textOf(ModernTwoColumnFactory, {
      ...data,
      // Main column: projects before experience; sidebar keeps skills.
      sectionOrder: ['projects', 'experience', 'profile', 'education', 'skills'],
    });
    expect(t.indexOf('wichtige projekte')).toBeLessThan(t.indexOf('berufserfahrung'));
    expect(t.indexOf('berufserfahrung')).toBeLessThan(t.indexOf('profil'));
    expect(t).toContain('fähigkeiten');
    expect(t).toContain('ausbildung');
  }, 30_000);

  it('minimal-single-column honors a custom order and appends missing sections', async () => {
    const t = await textOf(MinimalSingleColumnFactory, {
      ...data,
      sectionOrder: ['education', 'profile'], // partial: others appended in default order
    });
    expect(t.indexOf('ausbildung')).toBeLessThan(t.indexOf('profil'));
    expect(t.indexOf('profil')).toBeLessThan(t.indexOf('berufserfahrung'));
    expect(t).toContain('fähigkeiten');
  }, 30_000);

  it('executive-serif honors a custom order', async () => {
    const t = await textOf(ExecutiveSerifFactory, {
      ...data,
      sectionOrder: ['skills', 'experience', 'profile', 'education'],
    });
    expect(t.indexOf('fähigkeiten')).toBeLessThan(t.indexOf('berufserfahrung'));
    expect(t.indexOf('berufserfahrung')).toBeLessThan(t.indexOf('profil'));
    expect(t).toContain('ausbildung');
  }, 30_000);
});
