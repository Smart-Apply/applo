'use client';

import { useEffect, useState } from 'react';
import { type AiPromptSurface, type PromptUsage, estimateTokensByChars, evaluatePromptUsage } from '@/types';

type EncodeFn = (text: string) => number[];

/**
 * Module-level singleton: the gpt-4.1 tokenizer (o200k_base) is heavy (~MBs of
 * BPE data), so we lazy-load it once via dynamic import — Next.js splits it into
 * its own browser chunk that only downloads when a user actually focuses an AI
 * input. Shared across every `usePromptUsage` instance on the page. Resolves to
 * `null` if the chunk fails to load, in which case we fall back to the shared
 * character-based estimate.
 */
let encoderPromise: Promise<EncodeFn | null> | null = null;

function loadEncoder(): Promise<EncodeFn | null> {
  if (!encoderPromise) {
    encoderPromise = import('gpt-tokenizer/model/gpt-4.1')
      .then((mod) => mod.encode as EncodeFn)
      .catch(() => null);
  }
  return encoderPromise;
}

/**
 * Live character + token usage for a user-entered AI prompt (issue #520).
 *
 * Characters update instantly; tokens are computed with the real
 * `gpt-tokenizer/model/gpt-4.1` encoder (the same one the API validates with)
 * after a short debounce. Until the tokenizer chunk has loaded — or for text it
 * has not yet re-counted — the shared `estimateTokensByChars` approximation is
 * shown so the token figure is never blank and never stale for the current
 * text. The authoritative check still happens server-side.
 */
export function usePromptUsage(text: string, surface: AiPromptSurface): PromptUsage {
  // Track which exact text the real token count belongs to, so we never display
  // an accurate-but-stale count from a previous keystroke.
  const [counted, setCounted] = useState<{ text: string; tokens: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      void loadEncoder().then((encode) => {
        if (cancelled || !encode) return;
        try {
          setCounted({ text, tokens: encode(text).length });
        } catch {
          setCounted({ text, tokens: estimateTokensByChars(text) });
        }
      });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [text]);

  const tokens = counted?.text === text ? counted.tokens : estimateTokensByChars(text);

  return evaluatePromptUsage({ text, tokens }, surface);
}
