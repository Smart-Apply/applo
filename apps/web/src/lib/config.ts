/**
 * Runtime configuration
 * Fetches API URL dynamically from config endpoint with caching
 */

const STORAGE_KEY = 'smart_apply_api_url';
const defaultUrl = 'http://localhost:3000/api/v1';

let API_BASE_URL: string = '';
let configPromise: Promise<string> | null = null;

/**
 * Load cached API URL from localStorage
 */
function loadCachedUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save API URL to localStorage for future sessions
 */
function saveCachedUrl(url: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch (error) {
    console.warn('Failed to cache API URL:', error);
  }
}

/**
 * Fetch config from server.
 *
 * Always hits `/api/config` (no HTTP cache) so a deploy that changes the
 * API URL takes effect immediately on the next page load. The previous
 * implementation used `cache: 'force-cache'` plus a permanent localStorage
 * cache, which meant a stale API URL from a previous deploy would keep
 * being used forever — and would then be blocked by CSP after we switched
 * domains. See: CSP "Refused to connect" errors on the legacy Azure FQDN.
 */
async function fetchConfig(): Promise<string> {
  try {
    const response = await fetch('/api/config', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Config endpoint returned ${response.status}`);
    }

    const config = await response.json();
    const url = config.apiUrl || defaultUrl;

    // Refresh cache for offline/fallback use only.
    saveCachedUrl(url);
    API_BASE_URL = url;

    return url;
  } catch (error) {
    console.warn('Failed to fetch runtime config, using default:', error);

    // Use cached URL as fallback
    const cached = loadCachedUrl();
    const fallbackUrl = cached || defaultUrl;

    API_BASE_URL = fallbackUrl;
    return fallbackUrl;
  }
}

/**
 * Get API base URL.
 *
 * - First call: kicks off a singleton fetch to `/api/config` (the source of
 *   truth at runtime) and returns its result.
 * - Subsequent calls: return the in-memory cached value.
 *
 * The localStorage cache is no longer trusted up front — it is only used as
 * an offline fallback inside `fetchConfig()`. This prevents a stale cached
 * URL from a previous deploy / domain from being used after a redeploy.
 */
export async function getApiBaseUrl(): Promise<string> {
  // Return in-memory cached value immediately
  if (API_BASE_URL) return API_BASE_URL;

  // Singleton pattern: only one fetch request per session
  if (!configPromise) {
    configPromise = fetchConfig();
  }

  return configPromise;
}

/**
 * Get API base URL synchronously (for OAuth redirects and other sync contexts)
 * Returns cached value or default URL - never waits for async fetch.
 *
 * Note: this still consults localStorage because sync callers (e.g. OAuth
 * redirects) cannot await `/api/config`. Async callers should prefer
 * `getApiBaseUrl()` so they always get the live runtime value.
 */
export function getApiBaseUrlSync(): string {
  if (API_BASE_URL) return API_BASE_URL;

  const cached = loadCachedUrl();
  if (cached) {
    API_BASE_URL = cached;
    return cached;
  }

  return defaultUrl;
}
