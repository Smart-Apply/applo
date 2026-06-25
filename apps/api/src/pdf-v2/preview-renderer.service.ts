import { Injectable, Logger } from '@nestjs/common';
import * as nodePath from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { ReactPdfRendererService } from './react-pdf-renderer.service';
import type {
  CoverLetterTemplateData,
  ResumeTemplateData,
} from './template-data';
import { TemplateType } from '../generated/prisma/client';

/**
 * Generates A4-sized PNG previews of templates by rendering the template via
 * `@react-pdf/renderer` and rasterising page 1 with `pdfjs-dist`. Replaces
 * the puppeteer-based screenshot path that used to live in the legacy
 * `PdfService` (`generateScreenshot`).
 *
 * `pdfjs-dist` is loaded lazily because it ships only as ESM in modern
 * releases and the api package is CommonJS (`tsconfig.json` sets
 * `module: node16`). We use the same `new Function('m', 'return import(m)')`
 * workaround as `react-pdf-loader.ts`.
 *
 * The raster canvas comes from `doc.canvasFactory` (pdfjs' NodeCanvasFactory,
 * backed by the `@napi-rs/canvas` copy bundled WITH pdfjs-dist). Do not pass
 * a canvas from our own `@napi-rs/canvas` dependency: pdfjs builds `Path2D`
 * objects from its instance of the native module, and a context from a second
 * copy/version rejects them at render time with
 * "Value is none of these types `String`, `Path`".
 */
@Injectable()
export class PreviewRendererService {
  private readonly logger = new Logger(PreviewRendererService.name);
  private pdfjsModule: Promise<PdfjsNamespace> | null = null;

  /** A4 at 72 DPI — matches the legacy puppeteer call signature. */
  private static readonly PAGE_WIDTH_PT = 595;
  private static readonly PAGE_HEIGHT_PT = 842;
  /**
   * Render scale. 2x produces ~1190x1684 thumbnails — sharp on Retina,
   * still <250 KB after PNG compression. Tune here if needed.
   */
  private static readonly RENDER_SCALE = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reactPdfRenderer: ReactPdfRendererService,
  ) {}

  /**
   * Render the first page of `templateId` as a PNG buffer using sample data.
   *
   * Throws when the template has no react-pdf implementation registered in
   * `template-registry.ts` — there is no fallback path now that puppeteer
   * is gone.
   */
  async renderPreviewPng(templateId: string): Promise<Buffer> {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, type: true },
    });
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const pdfBuffer = await this.renderSamplePdf(templateId, template.type);
    return this.pdfPageToPng(pdfBuffer);
  }

  private async renderSamplePdf(templateId: string, type: TemplateType): Promise<Buffer> {
    if (type === TemplateType.COVER_LETTER) {
      const data = sampleCoverLetterData();
      const buf = await this.reactPdfRenderer.renderCoverLetter(data, templateId, {});
      if (!buf) {
        throw new Error(
          `Cover letter template "${templateId}" has no react-pdf implementation; cannot render preview.`,
        );
      }
      return buf;
    }

    // RESUME or BOTH → render the resume side (covers most of the design surface).
    const data = sampleResumeData();
    const buf = await this.reactPdfRenderer.renderResume(data, templateId, {});
    if (!buf) {
      throw new Error(
        `Resume template "${templateId}" has no react-pdf implementation; cannot render preview.`,
      );
    }
    return buf;
  }

  private async pdfPageToPng(pdfBuffer: Buffer): Promise<Buffer> {
    const pdfjs = await this.loadPdfjs();

    // Copy into a fresh Uint8Array — pdfjs detaches the underlying buffer.
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjs.getDocument({
      data,
      // Tell pdfjs we have no DOM. Disabling worker keeps everything on the
      // main thread, which is what we want server-side.
      disableFontFace: true,
      useSystemFonts: false,
      isEvalSupported: false,
      // Standard-14 PDF fonts (Helvetica etc.) ship with pdfjs-dist; without
      // this the rasteriser warns per glyph run and falls back to wrong
      // metrics.
      standardFontDataUrl: PreviewRendererService.resolveStandardFontDir(),
    });
    const doc = await loadingTask.promise;
    try {
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: PreviewRendererService.RENDER_SCALE });

      // pdfjs paints the page background white itself (render `background`
      // default), so no manual fill is needed.
      const { canvas, context } = doc.canvasFactory.create(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );

      await page.render({
        canvasContext: context,
        viewport,
        // Required by pdfjs >= 4 when using a non-DOM canvas.
        canvas,
      }).promise;

      const pngBuffer = canvas.toBuffer('image/png');
      this.logger.debug(
        `Preview PNG rendered (${canvas.width}x${canvas.height}, ${pngBuffer.length} bytes)`,
      );
      return Buffer.from(pngBuffer);
    } finally {
      // PDFDocumentProxy has no `destroy()` — only `cleanup()`. Tearing down
      // the loading task aborts the worker and releases the document. The old
      // `doc.destroy()` threw `TypeError: doc.destroy is not a function`,
      // which surfaced as a 500 on every freshly-rendered (uncached) preview.
      await loadingTask.destroy();
    }
  }

  private async loadPdfjs(): Promise<PdfjsNamespace> {
    if (!this.pdfjsModule) {
      // Same ESM workaround as react-pdf-loader.ts. `pdfjs-dist` exposes a
      // legacy CJS build at `pdfjs-dist/legacy/build/pdf.mjs` which still
      // requires the dynamic-import dance under TypeScript's `node16`
      // module resolution.
      const dynamicImport = new Function('m', 'return import(m)') as (
        m: string,
      ) => Promise<PdfjsNamespace>;
      this.pdfjsModule = dynamicImport('pdfjs-dist/legacy/build/pdf.mjs');
    }
    return this.pdfjsModule;
  }

  /**
   * Absolute path to pdfjs-dist's bundled standard-14 fonts. pdfjs
   * concatenates file names directly onto this string, so the trailing
   * separator is required.
   */
  private static resolveStandardFontDir(): string {
    return (
      nodePath.join(
        nodePath.dirname(require.resolve('pdfjs-dist/package.json')),
        'standard_fonts',
      ) + nodePath.sep
    );
  }
}

// ---------------------------------------------------------------------------
// Sample data — kept inline because it is preview-only and needs to exercise
// every section a real template might render. Mirrors the shape produced by
// `applications/resume-template.util.ts` but with synthetic strings.
// ---------------------------------------------------------------------------

function sampleResumeData(): ResumeTemplateData {
  return {
    candidateName: 'Max Mustermann',
    targetJobTitle: 'Senior Software Engineer',
    email: 'max.mustermann@example.com',
    phone: '+49 123 456789',
    linkedin: 'linkedin.com/in/maxmustermann',
    github: 'github.com/maxmustermann',
    street: 'Musterstraße 1',
    postalCode: '10115',
    city: 'Berlin',
    country: 'Deutschland',
    fullAddress: 'Musterstraße 1, 10115 Berlin, Deutschland',
    summary:
      'Erfahrener Softwareentwickler mit 5+ Jahren Erfahrung in der Full-Stack-Entwicklung mit Schwerpunkt auf skalierbaren Cloud-Anwendungen.',
    skillCategories: [
      { type: 'Programmiersprachen', skills: ['TypeScript', 'JavaScript', 'Python', 'Go'] },
      { type: 'Frameworks', skills: ['React', 'Next.js', 'NestJS', 'Express'] },
      { type: 'Cloud & DevOps', skills: ['Azure', 'AWS', 'Docker', 'Kubernetes'] },
    ],
    experiences: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'Berlin',
        dateRange: '2022 – heute',
        achievements: [
          'Entwicklung einer microservice-basierten Plattform mit 99.99% Uptime',
          'Führung eines Teams von 5 Entwicklern',
          'Reduktion der API-Latenz um 60% durch Caching-Strategie',
        ],
      },
      {
        title: 'Software Engineer',
        company: 'Startup GmbH',
        location: 'Hamburg',
        dateRange: '2019 – 2022',
        achievements: [
          'Aufbau der initialen Cloud-Infrastruktur in Azure',
          'Implementierung der CI/CD-Pipeline mit GitHub Actions',
        ],
      },
    ],
    education: [
      {
        degree: 'M.Sc. Informatik',
        institution: 'Technische Universität Berlin',
        year: '2019',
        fieldOfStudy: 'Informatik',
      },
    ],
    certifications: [
      { name: 'Azure Solutions Architect Expert', issuer: 'Microsoft', date: '2023' },
    ],
    languages: [
      { name: 'Deutsch', level: 'Muttersprache' },
      { name: 'English', level: 'C1' },
    ],
    language: 'de',
  };
}

function sampleCoverLetterData(): CoverLetterTemplateData {
  return {
    candidateName: 'Max Mustermann',
    targetJobTitle: 'Senior Software Engineer',
    email: 'max.mustermann@example.com',
    phone: '+49 123 456789',
    linkedin: 'linkedin.com/in/maxmustermann',
    street: 'Musterstraße 1',
    postalCode: '10115',
    city: 'Berlin',
    country: 'Deutschland',
    fullAddress: 'Musterstraße 1, 10115 Berlin, Deutschland',
    date: new Date().toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    companyName: 'Beispiel GmbH',
    recipientName: 'Frau Schmidt',
    content:
      '<p>Hiermit bewerbe ich mich für die Position als Senior Software Engineer in Ihrem Unternehmen.</p><p>Mit meiner mehrjährigen Erfahrung in der Softwareentwicklung und meiner Leidenschaft für skalierbare Systeme bin ich überzeugt, einen wertvollen Beitrag zu Ihrem Team leisten zu können.</p><p>Ich freue mich darauf, von Ihnen zu hören.</p>',
    closingPhrase: 'Mit freundlichen Grüßen',
    language: 'de',
  };
}

// ---------------------------------------------------------------------------
// Minimal type shims for the lazily-loaded ESM packages. We only declare the
// surface we actually call — full DefinitelyTyped packages would pull in DOM
// types which conflict with the rest of the api codebase.
// ---------------------------------------------------------------------------

interface PdfjsNamespace {
  getDocument(args: {
    data: Uint8Array;
    disableFontFace?: boolean;
    useSystemFonts?: boolean;
    isEvalSupported?: boolean;
    standardFontDataUrl?: string;
  }): PdfjsLoadingTask;
}

interface PdfjsLoadingTask {
  promise: Promise<PdfjsDocument>;
  /** Aborts the worker and releases the document. Resolves once torn down. */
  destroy(): Promise<void>;
}

interface PdfjsDocument {
  getPage(n: number): Promise<PdfjsPage>;
  /** pdfjs' NodeCanvasFactory — uses the @napi-rs/canvas copy bundled with pdfjs. */
  canvasFactory: PdfjsCanvasFactory;
}

interface PdfjsCanvasFactory {
  create(width: number, height: number): { canvas: PdfjsNodeCanvas; context: unknown };
}

interface PdfjsNodeCanvas {
  width: number;
  height: number;
  toBuffer(mime: 'image/png'): Uint8Array;
}

interface PdfjsPage {
  getViewport(args: { scale: number }): { width: number; height: number };
  render(args: {
    canvasContext: unknown;
    viewport: { width: number; height: number };
    canvas: unknown;
  }): { promise: Promise<void> };
}
