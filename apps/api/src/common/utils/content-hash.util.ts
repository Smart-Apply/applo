/**
 * Shared xxHash-64 content hashing for the caches that key on "did the input
 * change?". Mirrors the approach in `applications/utils/translation.util.ts`
 * (per-language translation cache); used by the Bewerbungs-Check dedupe cache.
 */

let xxhashInstance: Awaited<ReturnType<typeof importXxhash>> | null = null;

async function importXxhash() {
  // Dynamic import for ESM module compatibility
  const xxhashModule = await import('xxhash-wasm');
  const xxhash = xxhashModule.default || xxhashModule;
  return xxhash();
}

/**
 * xxHash-64 (hex) over the given parts. Parts are joined with a separator so
 * that shifting content across field boundaries produces a different hash.
 */
export async function hashContentParts(parts: readonly string[]): Promise<string> {
  if (!xxhashInstance) {
    xxhashInstance = await importXxhash();
  }

  return xxhashInstance.h64(parts.join('|||')).toString(16);
}
