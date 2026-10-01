"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, LayoutDashboard, Menu, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { clearSettings } from "@/lib/settings";

import { LogoMark } from "@/components/logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/test-page", label: "Test page", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState("");
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/notion/status");
        const data = (await res.json()) as { loggedIn?: boolean; workspace?: string | null };
        if (data.loggedIn) setWorkspace(data.workspace ?? "");
      } catch {
        /* unreachable — shell still renders */
      }
    })();
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    // Router subscription effect: drawer must close after every route change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavOpen(false);
  }, [pathname]);

  const initial = (workspace || "J").trim().charAt(0).toUpperCase() || "J";

  const navLinks = NAV.map((item) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-w-0 items-center gap-2.5 truncate rounded-md px-3 py-2 text-sm transition-colors ${
          active ? "bg-mist font-medium text-ink" : "text-smoke hover:bg-mist hover:text-ink"
        }`}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  });

  const profile = (
    <button
      type="button"
      onClick={() => {
        setCleared(false);
        setNavOpen(false);
        setOpen(true);
      }}
      className="flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-mist"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-white">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {workspace || "Notion workspace"}
        </span>
        <span className="block truncate text-xs text-smoke">Connected · view session</span>
      </span>
    </button>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-white md:flex">
        <div className="flex h-14 shrink-0 items-center px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 truncate font-display text-xl font-medium tracking-tight">
            <LogoMark size={24} />
            Docket
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-3">{navLinks}</nav>
        <div className="mt-auto shrink-0 border-t border-line p-3">{profile}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-white/85 px-3 py-2 backdrop-blur-md md:hidden">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Open navigation" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
              <SheetHeader className="border-b border-line">
                <SheetTitle className="flex items-center gap-2 font-display text-lg">
                  <LogoMark size={22} />
                  Docket
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 overflow-y-auto p-3">{navLinks}</nav>
              <div className="mt-auto border-t border-line p-3">{profile}</div>
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 truncate font-display text-lg font-medium tracking-tight"
          >
            <LogoMark size={20} />
            Docket
          </Link>
          <button
            type="button"
            onClick={() => {
              setCleared(false);
              setOpen(true);
            }}
            aria-label="View session"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-white"
          >
            {initial}
          </button>
        </header>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>

        {/* Mobile bottom nav — thumb-friendly on small screens */}
        <nav
          aria-label="Primary"
          className="sticky bottom-0 z-30 grid shrink-0 grid-cols-3 gap-1 border-t border-line bg-white/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
        >
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center gap-0.5 truncate rounded-md px-2 py-1.5 text-[11px] transition-colors ${
                  active ? "bg-mist font-medium text-ink" : "text-smoke hover:bg-mist hover:text-ink"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="break-words">{workspace || "Session"}</DialogTitle>
            <DialogDescription>
              Signed in with Notion. The token lives in a secure server cookie — this
              browser holds no credentials except optional display preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button render={<a href="/api/notion/disconnect" />}>Log out</Button>
            <Button
              variant="outline"
              onClick={() => {
                clearSettings();
                setCleared(true);
              }}
            >
              Clear local display settings
            </Button>
            {cleared ? (
              <p className="text-sm text-muted-foreground">Local settings cleared.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
