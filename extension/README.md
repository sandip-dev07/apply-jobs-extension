# Docket — browser extension

Detects job applications and saves them to Notion via the Next.js backend.

## Install (users)

- **Chrome:** add it from the Chrome Web Store (link on the landing page once published).
- **Firefox:** add it from Firefox Add-ons (link on the landing page once published).

Then sign in, pick a database, and test on `/test-page` (see below).

## Load unpacked (development only)

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.

### Firefox (121+)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select `extension/manifest.json`.
3. Note: temporary add-ons are removed on browser restart — reload it when needed.

## After installing (either browser)

1. Sign in with Notion on the app dashboard (**/login**). The extension borrows that
   login automatically — there is nothing to paste anywhere.
2. The backend is automatic: local dev server when it's running, otherwise the
   deployed app (see `PROD_BACKEND` in `background/background.js`).
3. If signed in, the popup shows your databases — pick one (or leave the dashboard
   default). If not, it shows an **Already signed in on the dashboard?** button that
   takes you there.
4. Hit **Test connection** in the popup to verify backend + Notion reachability.
5. **Refresh any open job tabs** so the content script injects.
6. Open the app's `/test-page` and try: Apply → Submit → success banner. The extension should detect and save.

> Changing the backend URL or reinstalling the browser clears site cookies, which signs
> the extension out too — just sign in on the dashboard again.

## How it works

- `content/content.js` — extracts job details (JSON-LD first, site selectors, DOM fallback),
  watches Apply clicks, arms on any submit (native event, Submit-like button for fetch-driven
  forms, or Enter key) with an extracted title, then observes DOM + SPA navigation for success
  phrases. Explicit application language ("Application submitted", …) saves automatically at high
  confidence; generic signals ("Thank you", "Response recorded", …) in freshly added nodes only
  raise a low-confidence “Possible application detected” prompt with Save/Ignore — never a silent write.
- `background/background.js` — dedupes by normalized URL + company + title, keeps a local log in
  extension storage, and POSTs to `<backend>/api/notion/save`. One signal per event: page flows
  toast in-page (auto path stays silent on success), failures and manual saves notify the OS.
- `popup/` — today's + total counts (local log merged with the Notion
  database via `GET_COMBINED`, so they match the dashboard; "Unknown" junk rows excluded),
  current-page job (shown only when a real company + title is detected), manual entry,
  session-aware settings with a database picker. Signed-out users get a single sign-in
  card instead of empty fields.

## Supported sites

`content.js` carries per-site profiles (`SITE_PROFILES`) for LinkedIn, Indeed, Greenhouse,
Lever, Ashby, Workday, iCIMS, SmartRecruiters, Taleo, Glassdoor, Wellfound, ZipRecruiter,
Dice, Monster, and Naukri: verified apply-button selectors, confirmation URL fingerprints
(Ashby `/application/submitted`, Lever `/thanks`, Greenhouse `?application_id=`), board-specific
success banners, and extraction overrides (LinkedIn/Lever headings). Everything else falls back
to the generic text + submit-event detector. Selector sources are noted inline in the file.

## Privacy

Only job metadata is collected (company, title, location, description, URLs, source).
Form contents, passwords, and payment data are never read or sent.
