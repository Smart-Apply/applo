import * as ReactPdf from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ReactPdfNamespace } from './react-pdf-loader';
import { createRichTextRenderer } from './rich-text';
import { collapseSoftWhitespace, normalizeResumeTemplateData } from './template-data';
import { ClassicAtsFactory } from './templates/classic-ats';

interface FakeComponentProps {
  children?: ReactNode;
  src?: string;
}

const fakeReactPdf = {
  Text: ({ children }: FakeComponentProps) => createElement('span', null, children),
  View: ({ children }: FakeComponentProps) => createElement('div', null, children),
  Link: ({ children, src }: FakeComponentProps) => createElement('a', { href: src }, children),
} as unknown as ReactPdfNamespace;

const reactPdf = ReactPdf as unknown as ReactPdfNamespace;

function renderMarkup(content: string): string {
  const renderRichText = createRichTextRenderer(fakeReactPdf);
  return renderToStaticMarkup(createElement(Fragment, null, renderRichText(content)));
}

describe('createRichTextRenderer', () => {
  it('collapses soft line breaks imported from a source document', () => {
    const content =
      'Cloud & AI Solution Architect with 4+\n' +
      'years of experience helping manufacturing customers accelerate digital\n' +
      'transformation through Microsoft Azure.';

    expect(renderMarkup(content)).toBe(
      '<span>Cloud &amp; AI Solution Architect with 4+ years of experience helping manufacturing customers accelerate digital transformation through Microsoft Azure.</span>',
    );
  });

  it('collapses HTML formatting whitespace but preserves explicit breaks', () => {
    expect(renderMarkup('<p>First line\ncontinues<br>Intentional break</p>')).toBe(
      '<span>First line continues<span>\n</span>Intentional break</span>',
    );
  });

  it('preserves paragraph boundaries inside block containers', () => {
    expect(renderMarkup('<div><p>First paragraph</p><p>Second paragraph</p></div>')).toBe(
      '<div><span>First paragraph</span><span>Second paragraph</span></div>',
    );
  });

  it('preserves spaces between inline formatting and non-breaking spaces', () => {
    expect(renderMarkup('<div><strong>Cloud</strong> <em>Architect</em></div>')).toBe(
      '<div><span><span>Cloud</span> <span>Architect</span></span></div>',
    );
    expect(renderMarkup('<p>Cloud&nbsp;Architect\ncontinues</p>')).toContain(
      'Cloud\u00a0Architect continues',
    );
    expect(collapseSoftWhitespace('one\u00a0two\nthree\u202ffour')).toBe(
      'one\u00a0two three\u202ffour',
    );
  });

  it('preserves ordered-list numbering', () => {
    const markup = renderMarkup('<ol><li>First step</li><li>Second step</li></ol>');

    expect(markup).toContain('<span>1.</span><span>First step</span>');
    expect(markup).toContain('<span>2.</span><span>Second step</span>');
    expect(markup).not.toContain('•');
  });

  it('does not emit an imported soft break in the rendered Classic ATS PDF', async () => {
    const Resume = ClassicAtsFactory.resume!(reactPdf);
    const summary =
      'Cloud & AI Solution Architect with 4+\n' +
      'years of experience helping manufacturing customers accelerate digital transformation.';
    const data = normalizeResumeTemplateData({
      candidateName: 'Navi Shirin Kumar',
      targetJobTitle: 'Cloud Solution Architect |\nMicrosoft Azure | AI Transformation',
      summary,
      language: 'en',
    });
    const buffer = await reactPdf.renderToBuffer(
      createElement(Resume, {
        data,
        meta: { language: 'en' },
      }),
    );
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const parsed = await parser.getText();
    await parser.destroy();

    expect(parsed.text).not.toContain('4+\nyears');
    expect(parsed.text.replace(/\s+/g, ' ')).toContain(summary.replace(/\s+/g, ' '));
    expect(parsed.text).not.toContain('Architect |\nMicrosoft');
    expect(parsed.text).toContain('Cloud Solution Architect | Microsoft Azure | AI Transformation');
  }, 30_000);
});

describe('normalizeResumeTemplateData', () => {
  it('collapses inline source wrapping but preserves explicit rich-text blocks', () => {
    const data = normalizeResumeTemplateData({
      candidateName: '  Navi\nShirin   Kumar  ',
      targetJobTitle: 'Cloud Solution Architect |\nMicrosoft Azure',
      email: 'navi@\nexample.com',
      phone: '+49 157\n88055598',
      linkedin: 'https://www.linkedin.com/in/\nnavi',
      summary: '<div><p>First line<br>continues</p>\n<p>Second paragraph</p></div>',
      skillCategories: [{ type: 'Core\nCompetencies', skills: ['Cloud\nArchitecture'] }],
      experiences: [
        {
          title: 'Solution\nArchitect',
          company: 'Example   GmbH',
          dateRange: 'Oct 2021 –\nPresent',
          achievements: ['Delivered  cloud\nsolutions'],
        },
      ],
    });

    expect(data.candidateName).toBe('Navi Shirin Kumar');
    expect(data.targetJobTitle).toBe('Cloud Solution Architect | Microsoft Azure');
    expect(data.email).toBe('navi@example.com');
    expect(data.phone).toBe('+49 157 88055598');
    expect(data.linkedin).toBe('https://www.linkedin.com/in/navi');
    expect(data.summary).toBe(
      '<div><p>First line continues</p>\n<p>Second paragraph</p></div>',
    );
    expect(data.skillCategories?.[0]).toEqual({
      type: 'Core Competencies',
      skills: ['Cloud Architecture'],
    });
    expect(data.experiences?.[0]).toMatchObject({
      title: 'Solution Architect',
      company: 'Example GmbH',
      dateRange: 'Oct 2021 – Present',
      achievements: ['Delivered cloud solutions'],
    });
  });
});