import { encode } from 'gpt-tokenizer/model/gpt-4.1';
import { estimateTokensByChars } from '@smart-apply/shared';

/**
 * Count tokens for a user prompt using the gpt-4.1 tokenizer (o200k_base) — the
 * same model family the application-generation pipeline targets — so this
 * authoritative server-side count matches what the model will actually see.
 *
 * The web client counts with the identical `gpt-tokenizer/model/gpt-4.1`
 * encoder, so the live UI counter and this check agree. If encoding throws for
 * any reason, we fall back to the shared character-based approximation (the
 * documented fallback from issue #520) rather than failing the request — the
 * coarse `@MaxLength` backstop on the DTO still caps pathological payloads.
 */
export function countPromptTokens(text: string | null | undefined): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    return estimateTokensByChars(text);
  }
}
