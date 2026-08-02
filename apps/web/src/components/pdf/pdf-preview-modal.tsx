'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CenteredLoader } from '@/components/shared/loading';
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { handleDownload } from '@/lib/pdf-utils';

// Set up PDF.js worker - bundle locally to avoid CDN/version mismatch and
// mixed-content/CORS issues with dynamic ESM imports during dev.
//
// ⚠️ VERSION LOCKSTEP: this specifier resolves to apps/web's own `pdfjs-dist`,
// while the `pdfjs` API imported above comes from the copy `react-pdf` pins.
// pdf.js hard-refuses to run when the two versions differ ("The API version X
// does not match the Worker version Y"), which surfaces as every preview
// failing with the generic "PDF konnte nicht geladen werden". Keep
// `pdfjs-dist` in apps/web/package.json pinned to exactly the version
// react-pdf depends on; `pnpm --filter @applo/web run check:pdfjs` enforces it
// in CI and in cf:build.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: string | Blob | File;
  filename: string;
  title: string;
  onExpired?: () => void;
  downloadWaitSeconds?: number;
}

/**
 * A4 width at react-pdf's default ~96dpi works out to ~794px. We use that
 * as the design baseline so "100% zoom" always means real-world A4 on
 * any device, then cap the actual render width by the container so the
 * page never overflows horizontally on a phone.
 */
const BASE_PAGE_WIDTH_PX = 794;

export function PDFPreviewModal({
  isOpen,
  onClose,
  file,
  filename,
  title,
  onExpired,
  downloadWaitSeconds = 0,
}: PDFPreviewModalProps) {
  const t = useTranslations('editor');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  // `zoom` is the user's explicit multiplier (1.0 = 100%). The pixel
  // width handed to <Page> is min(BASE * zoom, containerWidth), so on
  // mobile the page always fits horizontally at the default zoom.
  const [zoom, setZoom] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadCountdown, setDownloadCountdown] = useState<number | null>(null);

  // Measure the viewer container so we can fit pages to it. Using
  // ResizeObserver instead of `window.innerWidth` keeps this correct
  // when the dialog opens at non-fullscreen size or the device rotates.
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    const node = viewerRef.current;
    if (!node) return;

    const measure = () => {
      // Subtract a small inset so the page doesn't touch the scrollbar /
      // gutter. Floor to int because react-pdf canvas sizing flickers at
      // sub-pixel widths.
      const w = Math.max(0, Math.floor(node.clientWidth - 16));
      setContainerWidth(w);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isOpen]);

  // Reset state when a new file is opened so we don't carry "page 7 of 3"
  // across documents. setState IS the sync here (props → viewer state);
  // moving this to render would reset the page on every parent re-render
  // and break navigation/zoom mid-preview.
  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setZoom(1.0);
      setIsLoading(true);
    }
  }, [isOpen, file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    // Log name + message explicitly: pdf.js throws minified subclasses of
    // Error, and logging the object alone prints just the mangled class name
    // (e.g. "PDF loading error: N") with no clue what actually failed.
    console.error('PDF loading error:', error?.name, error?.message, error);
    setIsLoading(false);

    // Check if it might be an expired URL
    if (error.message.includes('403') || error.message.includes('404')) {
      onExpired?.();
    }
  }

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleDownloadClick = async () => {
    try {
      for (let seconds = downloadWaitSeconds; seconds > 0; seconds -= 1) {
        setDownloadCountdown(seconds);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1000);
        });
      }

      // If file is a Blob, create a temporary URL for download
      if (file instanceof Blob) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        await handleDownload(file, filename, onExpired);
      }
    } finally {
      setDownloadCountdown(null);
    }
  };

  // Cap the requested width by the container so the page never overflows
  // horizontally on mobile. When the user zooms in beyond the container,
  // the parent's `overflow-auto` lets them pan around.
  const requestedWidth = BASE_PAGE_WIDTH_PX * zoom;
  const renderWidth =
    containerWidth > 0 ? Math.min(requestedWidth, containerWidth) : requestedWidth;
  // What we display as the zoom percentage. On a phone where the
  // container is ~360px, "100% zoom" really fits an 800px page into
  // 360px, so we report the effective scale (~45%) instead of the
  // literal zoom multiplier — matches what the user actually sees.
  const displayedScale = renderWidth / BASE_PAGE_WIDTH_PX;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        // Mobile-first: dialog fills the screen so there's no wasted
        // chrome on a phone. From sm: up we restore a centred dialog
        // with rounded corners. `100dvh` (dynamic viewport height)
        // avoids the iOS Safari "URL bar pushes content out of view"
        // footgun that `100vh` has.
        className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:h-[90vh] sm:max-w-7xl sm:rounded-lg sm:border"
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle className="truncate pr-2 text-base sm:text-lg">{title}</DialogTitle>
        </DialogHeader>

        {/* PDF Viewer — flex-1 so it fills the space between header and
            controls, with overflow-auto for both pinch-zoom panning and
            multi-page scrolling. Centering comes from the child's `m-auto`,
            NOT items-center/justify-center on this container: flexbox
            centering pushes overflow past the unreachable start edge, which
            made a page taller than the viewport impossible to scroll to the
            top of (auto margins collapse to 0 once the content overflows). */}
        <div
          ref={viewerRef}
          className="flex flex-1 overflow-auto bg-muted/40 p-2 sm:p-4"
        >
          <div className="m-auto">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<CenteredLoader message={t('pdfPreview.loading')} />}
              error={
                <div className="text-center p-8">
                  <p className="text-destructive mb-2">{t('pdfPreview.errorTitle')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('pdfPreview.errorDescription')}
                  </p>
                </div>
              }
            >
              {/*
                Drive sizing with `width` instead of `scale`. With `scale`,
                react-pdf renders the page at full A4 width (794px) and
                lets the browser shrink it via CSS — but the canvas is
                still 794px so on a 360px phone the page overflows by
                ~430px. `width` resizes the actual canvas, which is what
                we want for crisp rendering AND no horizontal scroll.
              */}
              <Page
                pageNumber={pageNumber}
                width={renderWidth || undefined}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-md"
              />
            </Document>
          </div>
        </div>

        {/* Controls bar — pinned to the bottom on every screen. On
            mobile we extend `pb` with `env(safe-area-inset-bottom)` so
            the iOS home indicator doesn't sit on top of the buttons. */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-background px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-3 sm:pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1 || isLoading}
              aria-label={t('pdfPreview.previousPage')}
              className="h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[88px] text-center text-xs text-muted-foreground sm:min-w-[100px] sm:text-sm">
              {isLoading ? t('pdfPreview.loadingShort') : t('pdfPreview.pageCount', { page: pageNumber, pages: numPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || isLoading}
              aria-label={t('pdfPreview.nextPage')}
              className="h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={isLoading || zoom <= 0.5}
              aria-label={t('pdfPreview.zoomOut')}
              className="h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[44px] text-center text-xs text-muted-foreground sm:min-w-[60px] sm:text-sm">
              {Math.round(displayedScale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={isLoading || zoom >= 2.0}
              aria-label={t('pdfPreview.zoomIn')}
              className="h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleDownloadClick}
            size="sm"
            disabled={downloadCountdown !== null}
            className="h-10 w-full sm:h-9 sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloadCountdown === null
              ? t('pdfPreview.download')
              : t('pdfPreview.downloadWait', { seconds: downloadCountdown })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
