import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Database, Download, ExternalLink } from "lucide-react";
import { ChromeIcon, FirefoxIcon } from "@/components/browser-icons";
import { LogoMark } from "@/components/logo";
import { CHROME_WEB_STORE_URL, FIREFOX_ADDONS_URL } from "@/lib/stores";

const container = "mx-auto w-full max-w-5xl px-4 sm:px-6";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-carbon";
const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-mist";
const card = "rounded-lg border border-line bg-white";

function SectionLabel({ no, children }: { no: string; children: string }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-smoke">
      <span className="text-peri">{no}</span>
      <span className="text-line">{"  /  "}</span>
      {children}
    </p>
  );
}

const RECEIPTS = [
  { date: "Mar 12", company: "Razorpay", role: "SDE-1", status: "Interview", hot: true },
  { date: "Mar 11", company: "Google", role: "Frontend Engineer", status: "Applied", hot: false },
  { date: "Mar 09", company: "Zerodha", role: "Backend Intern", status: "Ghosted", hot: false },
  { date: "Mar 04", company: "Flipkart", role: "SDE-2", status: "Rejected", hot: false },
  { date: "Feb 28", company: "Swiggy", role: "Frontend Engineer", status: "Offer", hot: true },
];

const PIPELINE = [
  {
    file: "extension/content/content.js",
    what: "Reads the posting — JSON-LD when the site is polite, the DOM when it isn't — then watches for the Apply click and the “thank you” that follows.",
  },
  {
    file: "extension/background/background.js",
    what: "Checks URL + company + title against everything saved before. Seen it? Skipped quietly. New? Forwarded to your backend.",
  },
  {
    file: "app/api/notion/save/route.ts",
    what: "Your token lives here, on the server. It maps the fields onto your database and creates the row. The page never sees your credentials.",
  },
];

const LIMITS = [
  {
    title: "It can't see inside Workday iframes.",
    body: "That's the browser's doing, not a bug I can fix — cross-origin frames are sealed shut. The popup's manual save exists exactly for this.",
  },
  {
    title: "Unsure detections ask instead of saving.",
    body: "A wrong row in your database is worse than a missing one. Low confidence gets you a Save / Ignore prompt, never a silent write.",
  },
  {
    title: "“Works on LinkedIn” means usually.",
    body: "Easy Apply modals are covered, but LinkedIn redesigns weekly. When it misses, you tell me which page and I add a detector.",
  },
];

const FAQS = [
  {
    q: "Where does my data go?",
    a: "Nowhere except your Notion. A local log sits in the extension's own storage; the backend forwards new rows to Notion's API. No accounts, no analytics, no cloud of mine.",
  },
  {
    q: "Why Notion instead of a built-in tracker?",
    a: "You already live in Notion, and a database you can filter, sort, and annotate beats a dashboard I'd have to maintain. The web app here is just the plumbing and a fallback form.",
  },
  {
    q: "Will it spam my database with duplicates?",
    a: "That's the one thing it's paranoid about. Every save is checked against normalized URL + company + title, twice — once in the extension, once at the API. Submitting twice saves once.",
  },
  {
    q: "Does it read my application forms?",
    a: "No. It reads the posting — company, role, location, description — never your answers, files, or anything you type. Form contents stay in the tab.",
  },
];

export default function Home() {
  return (
    <div className="bg-white text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line bg-white/70 backdrop-blur-[13px]">
        <div className={`${container} flex h-14 items-center justify-between`}>
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-medium tracking-tight">
            <LogoMark size={24} />
            Docket
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-smoke lg:flex">
            <Link className="transition-colors hover:text-ink" href="#receipts">Receipts</Link>
            <Link className="transition-colors hover:text-ink" href="#how">How it works</Link>
            <Link className="transition-colors hover:text-ink" href="#extension">Extension</Link>
            <Link className="transition-colors hover:text-ink" href="#limits">Limitations</Link>
            <Link className="transition-colors hover:text-ink" href="#install">Install</Link>
            <Link className="transition-colors hover:text-ink" href="#faq">FAQ</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/settings" className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-carbon">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="dotgrid border-b border-line">
        <div className={`${container} grid items-start gap-12 bg-white/60 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]`}>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-smoke">
              Browser extension <span className="text-ash">/</span> Chrome &amp; Firefox
            </p>
            <h1 className="mt-5 font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl md:text-[3.5rem]">
              Hit Apply.
              <br />
              It&apos;s already in <span className="marker-gold">Notion.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-smoke">
              Docket catches the second your application goes through, then files the
              company, role, link, status, and description to your database. Nothing to type,
              nothing to remember.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="#install" className={`${btnPrimary} group`}>
                Install the extension
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/settings" className={btnGhost}>
                Connect Notion
              </Link>
            </div>
            <p className="mt-8 max-w-lg border-l-2 border-peri pl-4 font-mono text-[13px] leading-relaxed text-smoke">
              14:32:07&nbsp;&nbsp;<span className="text-green-600">✓</span> Acme Corp ·
              Frontend Engineer <span className="text-ash">→</span> Notion
            </p>
          </div>
          <div className="mx-auto md:my-auto grid w-full max-w-sm gap-3">
            <div className={`${card} p-4 shadow-[0_18px_50px_-24px_rgba(9,9,11,0.28)]`}>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-green-100 text-green-700">
                  <Check className="size-3.5" />
                </span>
                <p className="text-sm font-medium">Application detected</p>
              </div>
              <p className="mt-2 text-sm text-smoke">Acme Corp · Frontend Engineer · Applied</p>
            </div>
            <p className="text-center font-mono text-[11px] text-ash">↓ filed in 2 seconds ↓</p>
            <div className={`${card} p-4 shadow-[0_18px_50px_-24px_rgba(9,9,11,0.28)]`}>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-smoke">
                <Database className="size-3" /> Notion — Job Applications
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2 text-sm">
                <span className="truncate">
                  <strong className="font-semibold">Acme Corp</strong>{" "}
                  <span className="text-smoke">· Frontend Engineer</span>
                </span>
                <span className="shrink-0 rounded-md bg-peri/20 px-2 py-0.5 text-xs font-medium">
                  Applied
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Receipts */}
      <section id="receipts" className="scroll-mt-20 border-b border-line">
        <div className={`${container} py-16 md:py-24`}>
          <SectionLabel no="01">The receipt box</SectionLabel>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
            A month of applying, on one screen.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-smoke">
            Every row below was written by the extension, seconds after the confirmation page
            loaded. No spreadsheet was opened in the making of this table.
          </p>
          <div className="relative mt-10 max-w-2xl">
            <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg bg-mist" />
            <div aria-hidden className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg border border-line bg-white" />
            <div className={`relative ${card}`}>
              {RECEIPTS.map((r, i) => (
                <div
                  key={r.company + r.date}
                  className={`flex items-baseline justify-between gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <span className="w-14 shrink-0 font-mono text-[11px] text-smoke">{r.date}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <strong className="font-semibold">{r.company}</strong>
                    <span className="text-smoke"> · {r.role}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                      r.hot ? "bg-gold/40" : "bg-mist text-smoke"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 max-w-xl text-sm text-smoke">
            Five rows, zero typing. The <span className="marker-gold font-medium text-ink">Offer row is the point</span> —
            when it arrives, you&apos;ll know exactly which application it belongs to.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-b border-line bg-mist/60">
        <div className={`${container} py-16 md:py-24`}>
          <SectionLabel no="02">How it works</SectionLabel>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
            Three files do all the work.
          </h2>
          <div className="mt-10 max-w-3xl space-y-0">
            {PIPELINE.map((p, i) => (
              <div key={p.file} className="flex gap-5 border-t border-line py-6 last:border-b">
                <span className="font-display text-2xl text-peri">{i + 1}</span>
                <div>
                  <p className="font-mono text-[13px]">{p.file}</p>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-smoke">{p.what}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl border-l-2 border-gold pl-4 text-sm leading-relaxed text-smoke">
            One rule governs everything: <strong className="text-ink">visiting a job page is not an
            application.</strong> Clicking Apply starts a timer — only a confirmation message
            (“Application submitted”, “Thank you for applying”) writes the row.
          </p>
        </div>
      </section>

      {/* Extension */}
      <section id="extension" className="scroll-mt-20 border-b border-line bg-mist/60">
        <div className={`${container} grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2`}>
          <div>
            <SectionLabel no="03">The extension</SectionLabel>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
              The popup is the whole control room.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-smoke">
              No separate account, no extra tab. One click on the toolbar shows what was detected,
              what&apos;s pending your call, and what&apos;s already filed.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed">
              <li className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                <span><strong>Today + total counts</strong> and the five most recent applications.</span>
              </li>
              <li className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                <span><strong>Unsure detections wait here</strong> as Save / Ignore cards — nothing files itself silently.</span>
              </li>
              <li className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                <span><strong>Current-page job + manual entry</strong> for the sites automation can&apos;t reach.</span>
              </li>
              <li className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                <span><strong>Settings + Test connection</strong> live in the popup, so backend or Notion issues surface where you&apos;ll see them.</span>
              </li>
            </ul>
            <p className="mt-6 max-w-md border-l-2 border-peri pl-4 text-sm leading-relaxed text-smoke">
              It works offline-first: every detection is logged locally, then synced to Notion
              when your backend is reachable.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={CHROME_WEB_STORE_URL || "#install"}
                {...(CHROME_WEB_STORE_URL ? { target: "_blank", rel: "noreferrer" } : {})}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-mist"
              >
                <ChromeIcon className="size-4" /> Chrome Web Store
                {CHROME_WEB_STORE_URL ? <ExternalLink className="size-3.5 text-smoke" /> : null}
              </Link>
              <Link
                href={FIREFOX_ADDONS_URL || "#install"}
                {...(FIREFOX_ADDONS_URL ? { target: "_blank", rel: "noreferrer" } : {})}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-mist"
              >
                <FirefoxIcon className="size-4" /> Firefox Add-ons
                {FIREFOX_ADDONS_URL ? <ExternalLink className="size-3.5 text-smoke" /> : null}
              </Link>
            </div>
            <div className="mt-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">
                Smart detectors
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["LinkedIn", "Indeed", "Greenhouse", "Lever", "Ashby", "Workday", "iCIMS", "SmartRecruiters", "Taleo", "Glassdoor", "Wellfound", "ZipRecruiter", "Dice", "Monster", "Naukri"].map((s) => (
                  <span key={s} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-smoke ring-1 ring-line">
                    {s}
                  </span>
                ))}
                <span className="px-1 py-1 font-mono text-[11px] text-ash">+ generic fallback everywhere else</span>
              </div>
            </div>
          </div>
          {/* Popup mock */}
          <div className="mx-auto w-full max-w-[340px]">
            <div aria-hidden className="mx-auto h-5 w-24 rounded-t-md border border-b-0 border-line bg-mist" />
            <div className={`${card} p-4 shadow-[0_24px_60px_-24px_rgba(9,9,11,0.3)]`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">Docket</p>
                <span className="rounded-md bg-green-100 px-2 py-0.5 font-mono text-[11px] text-green-700">
                  saved to Notion
                </span>
              </div>
              <div className="mt-3 rounded-md border border-line p-3">
                <p className="text-xs font-semibold">Possible application detected</p>
                <p className="mt-0.5 text-xs text-smoke">Acme Corp · Frontend Engineer</p>
                <div className="mt-2 flex gap-2">
                  <span className="rounded-md bg-ink px-3 py-1 text-xs font-medium text-white">Save</span>
                  <span className="rounded-md border border-line px-3 py-1 text-xs">Ignore</span>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-line p-3">
                <p className="text-sm font-semibold">Today: 2 · Total: 23</p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between border-t border-line pt-1.5">
                    <span><strong>Razorpay</strong> <span className="text-smoke">· SDE-1</span></span>
                    <span className="text-smoke">Interview</span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1.5">
                    <span><strong>Google</strong> <span className="text-smoke">· Frontend Eng.</span></span>
                    <span className="text-smoke">Applied</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-mist p-3 text-xs text-smoke">
                Notion: connected
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[11px] text-ash">popup.html — all 340 pixels of it</p>
          </div>
        </div>
      </section>
      <section id="limits" className="scroll-mt-20 border-b border-line">
        <div className={`${container} py-16 md:py-24`}>
          <SectionLabel no="04">Honest limitations</SectionLabel>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
            What it <span className="marker-gold">won&apos;t</span> do.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-smoke">
            Every tracker demo shows the happy path. Here&apos;s the rest of it, upfront.
          </p>
          <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
            {LIMITS.map((l) => (
              <div key={l.title} className={`${card} p-6`}>
                <h3 className="font-semibold leading-snug">{l.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-smoke">{l.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="scroll-mt-20 border-b border-line bg-ink text-white">
        <div className={`${container} py-16 md:py-24`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
            <span className="text-peri-soft">05</span>
            <span className="text-white/20">{"  /  "}</span>Install
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
            Install it like any other extension.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-white/60">
            Add Docket from your
            browser&apos;s store, sign in with Notion, pick a database — the
            next Apply files itself.
          </p>

          {/* Store cards */}
          <div className="mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-ink">
                  <ChromeIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">Chrome Web Store</p>
                  <p className="font-mono text-[11px] text-white/50">Free · Manifest V3</p>
                </div>
              </div>
              {CHROME_WEB_STORE_URL ? (
                <Link
                  href={CHROME_WEB_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-white/90"
                >
                  <Download className="size-4" />
                  Add to Chrome
                </Link>
              ) : (
                <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-white/50">
                  Add to Chrome — coming soon
                </span>
              )}
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-ink">
                  <FirefoxIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">Firefox Add-ons</p>
                  <p className="font-mono text-[11px] text-white/50">Free · Firefox 121+</p>
                </div>
              </div>
              {FIREFOX_ADDONS_URL ? (
                <Link
                  href={FIREFOX_ADDONS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-white/90"
                >
                  <Download className="size-4" />
                  Get for Firefox
                </Link>
              ) : (
                <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-white/50">
                  Get for Firefox — coming soon
                </span>
              )}
            </div>
          </div>

          {/* Steps */}
          <ol className="mt-4 grid max-w-4xl gap-4 md:grid-cols-3">
            {[
              {
                no: "1",
                title: "Add the extension",
                body: "One click from the store. It updates itself from here on — never touch a folder again.",
              },
              {
                no: "2",
                title: "Sign in, pick a database",
                body: "Sign in with Notion in Settings and choose where new applications go. The popup picks it up automatically.",
              },
              {
                no: "3",
                title: "Just apply",
                body: "Refresh your job tabs once. The next confirmation page files the row to Notion in seconds.",
              },
            ].map((s) => (
              <li key={s.no} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="font-display text-2xl text-peri-soft">{s.no}</p>
                <p className="mt-2 font-medium">{s.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-b border-line">
        <div className={`${container} py-16 md:py-24`}>
          <SectionLabel no="06">Questions you&apos;d actually ask</SectionLabel>
          <div className="mt-8 max-w-3xl">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`py-6 ${i > 0 ? "border-t border-line" : ""}`}>
                <h3 className="font-display text-2xl font-medium">{f.q}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-smoke">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + footer */}
      <section>
        <div className={`${container} py-16 text-center md:py-24`}>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium tracking-tight md:text-6xl">
            Stop wondering <span className="marker-gold">where you applied.</span>
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/settings" className={`${btnPrimary} group`}>
              Connect Notion
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/dashboard" className={btnGhost}>
              Open the dashboard
            </Link>
          </div>
        </div>
        <footer className="border-t border-line">
          <div className={`${container} flex flex-col items-center justify-between gap-3 py-8 text-sm text-smoke sm:flex-row`}>
            <span>Docket — built for one job seeker, shared in case it helps a second.</span>
            <nav className="flex items-center gap-5">
              <Link className="inline-flex items-center gap-1 transition-colors hover:text-ink" href="/dashboard">
                Dashboard <ArrowUpRight className="size-3.5" />
              </Link>
              <Link className="inline-flex items-center gap-1 transition-colors hover:text-ink" href="/settings">
                Settings <ArrowUpRight className="size-3.5" />
              </Link>
              <Link className="inline-flex items-center gap-1 transition-colors hover:text-ink" href="/test-page">
                Test page <ArrowUpRight className="size-3.5" />
              </Link>
            </nav>
          </div>
        </footer>
      </section>
    </div>
  );
}
