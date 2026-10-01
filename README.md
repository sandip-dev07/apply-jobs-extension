# Docket

A personal job application tracker: a browser extension (Chrome + Firefox) that
notices the moment you apply for a job and files it in your Notion database, plus
a small Next.js app that hosts the API, a dashboard, and settings.

Full spec and build notes: [`.agents/app-idea.md`](.agents/app-idea.md)

## How it fits together

```
job site  →  extension detects Apply + confirmation  →  backend validates & dedupes  →  Notion
             (content.js)                              (/api/notion/save)               (your DB)
```

1. `extension/content/content.js` reads the posting (JobPosting JSON-LD first, DOM
   fallback), watches the Apply click, then observes the DOM and SPA navigation for
   confirmation text like "Application submitted".
2. `extension/background/background.js` dedupes by normalized URL + company + title,
   keeps a local log in extension storage, and forwards new records to the backend.
3. `app/api/notion/save/route.ts` holds the Notion token server-side, validates the
   payload, checks for duplicates, and maps fields onto your database schema.

Everything is logged locally first, so an outage never loses an application.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; the Settings UI can supply credentials instead
npm run dev
```

Open http://localhost:3000, sign in, pick your database, then hit **Test connection**.
(`/dashboard` and `/settings` are gated by `proxy.ts` — signed-out visitors land on `/login`.)

### Notion setup

**Sign in with Notion.** Create a **public** integration at
notion.so/my-integrations, enable OAuth, and register these redirect URIs:

- `http://localhost:3000/api/notion/callback` (local)
- `https://your-app.vercel.app/api/notion/callback` (production)

Set `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET`, and `NEXT_PUBLIC_APP_URL`
(see `.env.example`), then click **Sign in with Notion** on `/login` (or accept the
redirect from any protected page). The token is kept in a secure httpOnly server
cookie — it never enters page JavaScript. OAuth-only by design: no token field
exists anywhere in the app or the extension.

Pick your database from the picker in Settings, or create a fresh one there (it builds
the full schema inside any page shared with the integration); either way it's
remembered server-side too.

### Database schema

Property matching is fuzzy and case-insensitive; missing properties are skipped
rather than erroring. `Job URL` as a URL-type property is what powers duplicate
detection.

Statuses: `Applied, Interview, Assessment, Offer, Rejected, Ghosted, Withdrawn`.

### Extension setup

See [`extension/README.md`](extension/README.md) to install from the Chrome Web Store /
Firefox Add-ons (or load unpacked for local development).

## Scripts

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build (includes typecheck)
npm run start    # serve the production build
npm run lint     # eslint
npx tsc --noEmit # typecheck only
```

## Deploy

Deploy the Next.js app to Vercel, then set `NOTION_TOKEN` and `NOTION_DATABASE_ID`
in the project's environment variables. Point the extension's backend URL at the
deployed domain. Credentials can also be supplied per-request from Settings or the
extension popup, which is convenient for local use.

## Project layout

```
app/          landing, dashboard, settings, test-page, api/notion/*
components/   app-nav, browser-icons, ui/ (shadcn)
lib/          notion.ts, dedupe.ts, constants.ts, settings.ts
types/        job.ts (JobDetails, ApplicationRecord, statuses)
extension/    manifest.json, background/, content/, popup/, icons/
```

## Privacy

Only job metadata is collected — company, title, location, description, URLs, and
source. Form contents, passwords, and payment data are never read or transmitted.

## Design system

Light theme with ink `#09090b`, muted `#565553`, surfaces `#f5f5f3`, lavender
`#9b8dff` and gold `#e7c066` accents, EB Garamond display type, mono labels, and a
tight 2–8px radius scale. Tokens live in `app/globals.css` under `@theme`.
