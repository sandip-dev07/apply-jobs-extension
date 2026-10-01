/**
 * Browser store listings for the Docket extension.
 *
 * Set these once the listings are live — no code changes needed afterwards:
 *
 *   NEXT_PUBLIC_CHROME_WEB_STORE_URL=https://chromewebstore.google.com/detail/...
 *   NEXT_PUBLIC_FIREFOX_ADDON_URL=https://addons.mozilla.org/firefox/addon/...
 *
 * Empty string means "not published yet" — the landing page renders a
 * "Coming soon" state instead of a dead link.
 */
export const CHROME_WEB_STORE_URL =
  (process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL ?? "").trim();

export const FIREFOX_ADDONS_URL =
  (process.env.NEXT_PUBLIC_FIREFOX_ADDON_URL ?? "").trim();

export const STORES_LIVE = Boolean(CHROME_WEB_STORE_URL || FIREFOX_ADDONS_URL);
