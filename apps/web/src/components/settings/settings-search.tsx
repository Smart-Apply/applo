/* =============================================================================
 *  settings-search.tsx
 *  TARGET PATH: apps/web/src/components/settings/settings-search.tsx
 *
 *  Type-to-find search over every setting. Filters SETTINGS_SEARCH_INDEX and
 *  navigates to the owning section on select (?section=…). Improves
 *  learnability — users don't need to know which tab a setting lives under.
 * ========================================================================== */

'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronRight } from 'lucide-react';
import {
  SETTINGS_SEARCH_INDEX,
  SETTINGS_SECTIONS,
  type SettingsSearchEntry,
} from '@/lib/settings-sections';

const sectionLabel = (id: string) =>
  SETTINGS_SECTIONS.find((s) => s.id === id)?.label ?? '';

function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[2px] bg-warning-soft px-0.5 text-foreground dark:bg-amber-400/25">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

export function SettingsSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const hits = useMemo<SettingsSearchEntry[]>(
    () =>
      q
        ? SETTINGS_SEARCH_INDEX.filter((it) =>
            `${it.title} ${it.keywords}`.toLowerCase().includes(q),
          )
        : [],
    [q],
  );

  const go = (section: string) => {
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/settings?section=${section}`, { scroll: false });
  };

  const open = focused && q.length > 0;

  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Einstellungen durchsuchen…"
        aria-label="Einstellungen durchsuchen"
        className="h-11 w-full rounded-[4px] border border-input bg-background pl-11 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[3px] p-1 text-muted-foreground hover:bg-muted"
          aria-label="Suche zurücksetzen"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[4px] border border-border bg-popover shadow-md">
          {hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Keine Einstellung zu &bdquo;<span className="font-medium text-foreground">{query}</span>&ldquo; gefunden.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((it, i) => {
                const Icon = it.icon;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(it.section)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          <Highlight text={it.title} query={query} />
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {sectionLabel(it.section)}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
