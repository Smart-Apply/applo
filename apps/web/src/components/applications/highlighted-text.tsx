'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { KeywordMatch } from '@/types';

interface HighlightedTextProps {
  text: string;
  keywords: KeywordMatch[];
  className?: string;
  highlightClassName?: string;
  showTooltip?: boolean;
}

/**
 * Component that highlights keywords in text
 * Matched keywords are shown in green, missing in yellow/orange
 */
export function HighlightedText({
  text,
  keywords,
  className,
  highlightClassName,
  showTooltip = true,
}: HighlightedTextProps) {
  const highlightedContent = useMemo(() => {
    if (!keywords || keywords.length === 0) {
      return text;
    }

    // Sort keywords by length (longest first) to avoid partial matches
    const sortedKeywords = [...keywords].sort(
      (a, b) => b.keyword.length - a.keyword.length
    );

    // Create a map of keyword positions
    interface MatchPosition {
      start: number;
      end: number;
      keyword: KeywordMatch;
    }
    const positions: MatchPosition[] = [];

    // Find all keyword occurrences
    const lowerText = text.toLowerCase();
    for (const kw of sortedKeywords) {
      const lowerKeyword = kw.keyword.toLowerCase();
      let startIndex = 0;

      while (startIndex < text.length) {
        const index = lowerText.indexOf(lowerKeyword, startIndex);
        if (index === -1) break;

        // Check if this position overlaps with existing matches
        const overlaps = positions.some(
          (p) => index < p.end && index + kw.keyword.length > p.start
        );

        if (!overlaps) {
          positions.push({
            start: index,
            end: index + kw.keyword.length,
            keyword: kw,
          });
        }

        startIndex = index + 1;
      }
    }

    // Sort positions by start index
    positions.sort((a, b) => a.start - b.start);

    // Build the highlighted content
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const pos of positions) {
      // Add text before this match
      if (pos.start > lastEnd) {
        parts.push(text.slice(lastEnd, pos.start));
      }

      // Add the highlighted keyword
      const matchedText = text.slice(pos.start, pos.end);
      const highlightClass = pos.keyword.found
        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded px-0.5'
        : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded px-0.5';

      if (showTooltip) {
        parts.push(
          <span
            key={pos.start}
            className={cn('relative group cursor-help', highlightClass, highlightClassName)}
          >
            {matchedText}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <span className="bg-popover text-popover-foreground text-xs rounded shadow-lg px-2 py-1 whitespace-nowrap border">
                {pos.keyword.found ? '✓ In Profil gefunden' : '⚠ Nicht in Profil'}
                {pos.keyword.confidence && (
                  <span className="ml-1 opacity-70">
                    ({Math.round(pos.keyword.confidence * 100)}%)
                  </span>
                )}
              </span>
            </span>
          </span>
        );
      } else {
        parts.push(
          <span
            key={pos.start}
            className={cn(highlightClass, highlightClassName)}
          >
            {matchedText}
          </span>
        );
      }

      lastEnd = pos.end;
    }

    // Add remaining text
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }

    return parts;
  }, [text, keywords, showTooltip, highlightClassName]);

  return <span className={className}>{highlightedContent}</span>;
}

interface HighlightedParagraphsProps {
  paragraphs: string[];
  keywords: KeywordMatch[];
  className?: string;
}

/**
 * Component that highlights keywords across multiple paragraphs
 */
export function HighlightedParagraphs({
  paragraphs,
  keywords,
  className,
}: HighlightedParagraphsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {paragraphs.map((paragraph, idx) => (
        <p key={idx} className="text-sm leading-relaxed">
          <HighlightedText text={paragraph} keywords={keywords} />
        </p>
      ))}
    </div>
  );
}

interface KeywordLegendProps {
  className?: string;
}

/**
 * Legend explaining the highlight colors
 */
export function KeywordLegend({ className }: KeywordLegendProps) {
  return (
    <div className={cn('flex items-center gap-4 text-xs text-muted-foreground', className)}>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700" />
        <span>In Profil vorhanden</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700" />
        <span>Fehlt im Profil</span>
      </div>
    </div>
  );
}
