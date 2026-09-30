"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clearSettings } from "@/lib/settings";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/test-page", label: "Test page" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState("");
  const [open, setOpen] = useState(false);
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

  const initial = (workspace || "J").trim().charAt(0).toUpperCase() || "J";

  const nav = (
    <>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              active ? "bg-mist font-medium text-ink" : "text-smoke hover:bg-mist hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  const profile = (
    <button
      type="button"
      onClick={() => {
        setCleared(false);
        setOpen(true);
      }}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-mist"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-white">
        {initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {workspace || "Notion workspace"}
        </span>
        <span className="block text-xs text-smoke">Connected · view session</span>
      </span>
    </button>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-white md:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/" className="font-display text-xl font-medium tracking-tight">
            Job&nbsp;Tracker
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-3">{nav}</nav>
        <div className="mt-auto border-t border-line p-3">{profile}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-white/70 px-4 py-2 backdrop-blur-[13px] md:hidden">
          <Link href="/" className="font-display text-lg font-medium tracking-tight">
            Job&nbsp;Tracker
          </Link>
          <nav className="flex items-center gap-1 text-sm text-smoke">{nav}</nav>
        </header>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <div className="border-t border-line p-3 md:hidden">{profile}</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{workspace || "Session"}</DialogTitle>
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
