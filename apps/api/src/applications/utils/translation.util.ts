/**
 * Content hashing for the per-language translation cache
 * (`Application.translations` — see `translation/translation.service.ts`).
 *
 * History: this file once carried a full "Smart Language Switching" cache
 * (LRU eviction, prewarming, partial re-translation). That feature was
 * stripped in commit 036017e4; the remaining dead code was removed when
 * translation-on-export shipped (docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md).
 * Only the hash survives — it keys cache invalidation: a translation entry
 * is valid only while the hash of the current source content matches.
 */

// Singleton xxhash instance for performance
let xxhashInstance: Awaited<ReturnType<typeof importXxhash>> | null = null;

async function importXxhash() {
  // Dynamic import for ESM module compatibility
  const xxhashModule = await import('xxhash-wasm');
  const xxhash = xxhashModule.default || xxhashModule;
  return xxhash();
}

/**
 * Calculate xxHash-64 of resume and cover letter content
 * Used for cache invalidation detection
 *
 * @param resume - Stored resume JSON (object or already-serialized string)
 * @param coverLetter - Cover letter HTML/Markdown string
 * @returns 64-bit hash as hex string
 */
export async function calculateContentHash(
  resume: object | string | null | undefined,
  coverLetter: string | null | undefined,
): Promise<string> {
  if (!xxhashInstance) {
    xxhashInstance = await importXxhash();
  }

  // Normalize inputs
  const resumeStr = typeof resume === 'string' ? resume : JSON.stringify(resume || {});
  const coverStr = coverLetter || '';

  // Concatenate with separator to avoid collision
  const content = `${resumeStr}|||${coverStr}`;

  // Use xxHash64 for fast, non-cryptographic hashing
  const hashBigInt = xxhashInstance.h64(content);
  return hashBigInt.toString(16);
}
