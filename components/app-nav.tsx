import Link from "next/link";

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/70 backdrop-blur-[13px]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-medium tracking-tight">
          Docket
        </Link>
        <nav className="flex items-center gap-1 text-sm text-smoke">
          <Link className="rounded-md px-3 py-1.5 transition-colors hover:bg-mist hover:text-ink" href="/dashboard">
            Dashboard
          </Link>
          <Link className="rounded-md px-3 py-1.5 transition-colors hover:bg-mist hover:text-ink" href="/test-page">
            Test page
          </Link>
          <Link className="rounded-md px-3 py-1.5 transition-colors hover:bg-mist hover:text-ink" href="/settings">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
