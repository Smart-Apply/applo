// OpenNext configuration for Cloudflare Workers deployment.
//
// Docs: https://opennext.js.org/cloudflare
//
// Caching is intentionally LEFT OFF for the initial launch:
//   - No R2 incremental cache (keeps the deploy simple, one bucket only)
//   - No KV / D1 caches
//   - No tag cache
//
// To enable later, follow https://opennext.js.org/cloudflare/caching and add
// a `NEXT_INC_CACHE_R2_BUCKET` binding in wrangler.jsonc + the matching
// override import here.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({
  // No incrementalCache override -> uses Worker memory only (fine for launch)
});
