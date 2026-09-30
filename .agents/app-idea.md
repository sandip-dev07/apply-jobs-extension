Build a personal Job Application Tracker Chrome Extension.

Goal:
Whenever I apply for a job, detect the application automatically, extract the job details, and save the application to my Notion database so I never forget where I applied.

Tech stack:
- Chrome Extension Manifest V3
- Next.js + TypeScript
- shadcn/ui
- Tailwind CSS
- Vercel for deployment
- Notion API
- Chrome Storage API

Important: This is a personal MVP. Keep it simple, reliable, and production-ready. Do not over-engineer.

## Core Flow

Job page
→ Detect job details
→ Detect Apply click
→ Track application flow
→ Detect successful submission
→ Save to Notion

### 1. Detect Job Details

Automatically extract:

- Company name
- Job title
- Location
- Job URL
- Application URL
- Source/platform

Prefer JobPosting JSON-LD when available, then fall back to DOM extraction.

Support generic job websites first.

### 2. Detect Application

Do NOT consider simply visiting a job page as an application.

Detect common actions:

- Apply
- Apply Now
- Easy Apply
- Apply for this job
- Submit application

After the user clicks Apply, temporarily track the application.

Use MutationObserver and navigation/history detection so it works with React/SPA websites.

### 3. Detect Successful Submission

Look for confirmation messages such as:

- Application submitted
- Application received
- Thank you for applying
- Successfully applied
- We've received your application

When confirmed:

Show:

"✓ Application detected"

Company: Example
Role: Frontend Developer

Then save it to Notion automatically.

If confidence is low, show:

"Possible application detected"

[Save] [Ignore]

### 4. Notion Integration

Allow me to connect my Notion account and select a database.

Create records with:

- Company
- Job Title
- Status
- Job URL
- Application URL
- Location
- Source
- Applied Date
- Notes

Default status: Applied

Statuses:

Applied, Interview, Assessment, Offer, Rejected, Ghosted, Withdrawn

Prevent duplicate records using normalized job URL + company + job title.

Never expose API keys, OAuth secrets, or access tokens in client-side code.

Use a secure Next.js/Vercel API route when server-side credentials are required.

### 5. Extension UI

Create a clean shadcn/ui popup showing:

- Applications today
- Recent applications
- Current detected job
- Status
- Save manually
- Ignore
- Open Notion

Example:

Google
Frontend Engineer
Applied

Razorpay
SDE-1
Interview

Also provide a manual fallback:

Company
Job Title
Job URL
Application URL
Location
Status

[Save Application]

### 6. Architecture

Keep the extension and Next.js app modular.

Suggested structure:

src/
  extension/
    background/
    content/
    detectors/
    storage/
  app/
    api/
    dashboard/
    settings/
  components/
  lib/
  types/

Create a generic detector first. Platform-specific detectors can later be added for LinkedIn, Greenhouse, Lever, Workday, etc.

### 7. Privacy

Only collect job/application metadata.

Never capture:

- passwords
- payment information
- government IDs
- unrelated form data
- entire application forms

Do not send unnecessary page content to the server.

### 8. Testing

Create a local mock job page that simulates:

Job page → Apply → Application form → Submit → "Application submitted"

Test:

- Job extraction
- Apply detection
- Submission detection
- Confirmation detection
- Duplicate prevention
- Notion integration

### 9. Development

First inspect the existing workspace before making changes.

Then:

1. Create the project structure.
2. Implement the MVP.
3. Run typecheck/lint/tests.
4. Fix errors.
5. Build successfully.
6. Explain how to load the extension in Chrome.
7. Explain how to configure Notion.
8. Explain how to deploy the Next.js backend to Vercel.

Do not ask unnecessary questions. Make reasonable assumptions and document them.

Start by inspecting the workspace and implement the MVP.

---

# Build status — as shipped

Everything in the spec above is implemented. This section records where the
implementation made concrete decisions, so the doc stays the source of truth.

## Shipped structure (actual paths)

```
extension/                 # loaded directly as unpacked / temporary add-on (no build step)
  manifest.json            # MV3 + gecko block (Firefox 121+)
  background/background.js # service worker: dedupe, local log, backend sync
  content/content.js       # generic detector: JSON-LD → DOM, Apply watch, confirmation watch
  popup/                   # popup.html / .css / .js — counts, pending, manual, settings
  icons/                   # 16 / 48 / 128 px
app/
  page.tsx                 # landing
  dashboard/               # counts, recent from Notion, manual save fallback
  settings/                # backend URL + Notion token/DB, Test connection, DB picker
  test-page/               # mock job page for end-to-end rehearsal
  api/notion/save/         # validate → dedupe → map to schema → create page
  api/notion/list/         # recent records for the dashboard
  api/notion/status/       # connection check (GET) + database discovery (POST)
components/                # app-nav, browser-icons, ui/ (shadcn)
lib/                       # notion.ts, dedupe.ts, constants.ts, settings.ts
types/job.ts
```

Note: the spec suggested `src/extension/...`. The extension lives at the repo
root instead because browsers load a manifest folder directly — no bundler, no
`src` layer, and it keeps `chrome://extensions` → Load unpacked pointed at one
stable directory.

## Decisions that extend the spec

| Area | Decision | Reason |
| --- | --- | --- |
| Extension polyfill | `browser.*` on Firefox, `chrome.*` on Chrome via a one-line shim | Firefox MV3 is supported for free; the popup is the same code |
| Job description | Extracted (JSON-LD `description`, else DOM containers, else meta) and saved | Added after the initial build on request; maps to a Description property or merges into Notes |
| Low-confidence path | Pending detections surface as Save / Ignore in the popup and as a page toast | Implements spec §3 "Possible application detected" without ever writing silently |
| Notion credentials | Env vars (`NOTION_TOKEN`, `NOTION_DATABASE_ID`) **or** per-request values from Settings **or** OAuth login cookie | Keeps production config server-side while letting a personal MVP configure itself from the UI; precedence is explicit → cookie → env |
| Extension auth | No pasted tokens: the popup borrows the dashboard login via the `cookies` permission (`nt_token`), with a legacy fallback for old installs | Removes the classic token-into-database-field mix-up; signed-out popups show an "Already signed in on the dashboard?" button instead of empty fields |
| Notion login | OAuth-only: `/api/notion/auth` → Notion consent → `/api/notion/callback` exchanges the code, stores the token in an httpOnly cookie | Standard OAuth with `state` CSRF check; requires a **public** integration with the callback URI registered. No token fields exist anywhere. |
| Backend resolution | Web app uses same-origin relative URLs (zero config); the extension auto-probes `localhost:3000`, custom override tucked in Settings → Advanced | Production needs the Vercel URL set once — the one value no code can derive |
| Route protection | `proxy.ts` gates `/dashboard/*` and `/settings/*` on the login cookie, redirecting to `/login?next=…`; OAuth honors `next` via a short-lived cookie | Optimistic cookie-presence check per Next.js guidance; validity re-checked inside API routes |
| Database creation | `/api/notion/pages` lists shared pages, `/api/notion/create-db` builds the tracker schema inside the chosen parent and selects it | Notion only allows creation as the child of a page, so a shared parent page is required |
| Property mapping | Fuzzy, case-insensitive name matching; unknown properties skipped | Lets any Notion schema work; the app never errors on a missing property |
| Offline behaviour | Detection always writes to extension storage first, then syncs | A backend outage or unconfigured Notion never loses a record |
| Design system | Light theme, ink `#09090b`, muted `#565553`, surfaces `#f5f5f3`, accents lavender `#9b8dff` / gold `#e7c066`, EB Garamond display + mono labels, 2–8px radius scale | Visual direction taken from mem0.ai; see `app/globals.css` `@theme` |

## Statuses

`Applied, Interview, Assessment, Offer, Rejected, Ghosted, Withdrawn` — defined
once in `types/job.ts` and imported everywhere. Default is `Applied`.

## Known limits (documented on the landing page too)

- Cross-origin iframes (Workday) are invisible to content scripts — manual save is the fallback.
- Detection is heuristic ("usually works" on sites that redesign often); platform-specific detectors are the next step if a board misbehaves. Plain generic forms (no Apply step, no application wording) resolve to a low-confidence Save/Ignore prompt, never an auto-save.
- Firefox support is built on API compatibility and needs a live pass in Firefox before being called verified.

## Commands

```
npm run dev      # local app at http://localhost:3000
npm run build    # production build (also runs typecheck)
npx tsc --noEmit # typecheck only
```
