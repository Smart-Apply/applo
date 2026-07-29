import { createElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import * as ReactPdfLoader from './react-pdf-loader';
import type { ReactPdfNamespace, ReactPdfStyle } from './react-pdf-loader';
import { ReactPdfRendererService } from './react-pdf-renderer.service';
import { listRegisteredKeys } from './template-registry';
import type { ResumeTemplateData } from './template-data';
import type { ReactPdfResumeProps } from './types';

const Passthrough = ({ children }: { children?: ReactNode }) =>
  createElement('div', null, children);

describe('ReactPdfRendererService resume normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(listRegisteredKeys())('normalizes soft wraps before rendering %s', async (key) => {
    let renderedData: ResumeTemplateData | undefined;
    const renderToBuffer = vi.fn(async (element: ReactElement) => {
      renderedData = (element as ReactElement<ReactPdfResumeProps>).props.data;
      return Buffer.from('pdf');
    });
    const reactPdf = {
      Document: Passthrough,
      Page: Passthrough,
      View: Passthrough,
      Text: Passthrough,
      Link: Passthrough,
      Image: Passthrough,
      StyleSheet: {
        create: <T extends Record<string, ReactPdfStyle>>(styles: T) => styles,
      },
      Font: { register: vi.fn() },
      renderToBuffer,
    } as ReactPdfNamespace;
    vi.spyOn(ReactPdfLoader, 'loadReactPdf').mockResolvedValue(reactPdf);

    const findUnique = vi.fn().mockResolvedValue({
      id: `${key}-resume`,
      name: key,
      baseTemplateId: key,
      category: 'resume',
      language: 'en',
      accentColor: null,
      colorVariantName: null,
    });
    const prisma = { template: { findUnique } } as unknown as PrismaService;
    const service = new ReactPdfRendererService(prisma);

    await service.renderResume(
      {
        candidateName: 'Navi\nShirin Kumar',
        targetJobTitle: 'Cloud Solution Architect |\nMicrosoft Azure',
        email: 'navi@\nexample.com',
        summary: 'Architect with 4+\nyears of experience.',
      },
      `${key}-resume`,
    );

    expect(renderToBuffer).toHaveBeenCalledOnce();
    expect(renderedData).toMatchObject({
      candidateName: 'Navi Shirin Kumar',
      targetJobTitle: 'Cloud Solution Architect | Microsoft Azure',
      email: 'navi@example.com',
      summary: 'Architect with 4+ years of experience.',
    });
  });
});