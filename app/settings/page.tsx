"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadSettings, saveSettings } from "@/lib/settings";
import { AppShell } from "@/components/app-shell";

interface Db { id: string; title: string }
interface ParentPage { id: string; title: string; url: string }

export default function SettingsPage() {
  const [databaseId, setDatabaseId] = useState("");
  const [databases, setDatabases] = useState<Db[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [parentPages, setParentPages] = useState<ParentPage[]>([]);
  const [parentId, setParentId] = useState("");
  const [dbTitle, setDbTitle] = useState("Job Applications");
  const [creating, setCreating] = useState(false);

  // Load everything on mount: stored selection + available databases.
  useEffect(() => {
    setDatabaseId(loadSettings().notionDatabaseId);
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("connected") === "1") setNote("Signed in with Notion.");
      const err = qs.get("error");
      if (err) setNote(`Sign-in failed: ${err}`);
      if (qs.get("connected") || err) window.history.replaceState(null, "", window.location.pathname);
    } catch {
      /* ignore */
    }
    void (async () => {
      try {
        const res = await fetch("/api/notion/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await res.json()) as { ok: boolean; databases?: Db[]; error?: string };
        if (data.ok) {
          setDatabases(data.databases ?? []);
          if (!(data.databases ?? []).length) setNote("No databases shared with this integration yet — share one in Notion, or create one below.");
        } else {
          setNote(data.error ?? "Could not load databases.");
        }
      } catch {
        setNote("Could not reach the backend.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function verify(id: string): Promise<boolean> {
    try {
      const qs = new URLSearchParams();
      qs.set("databaseId", id);
      const res = await fetch(`/api/notion/status?${qs.toString()}`);
      const data = (await res.json()) as { ok: boolean; reachable?: boolean; databaseTitle?: string };
      if (data.ok && data.reachable) {
        setNote(`Connected to “${data.databaseTitle || "database"}”. New applications file there.`);
        return true;
      }
      setNote("Selected, but the connection check failed — re-share it with the integration and reselect.");
      return false;
    } catch {
      setNote("Selected, but unreachable right now.");
      return false;
    }
  }

  async function persistServerDb(id: string) {
    try {
      await fetch("/api/notion/select-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: id || undefined }),
      });
    } catch {
      /* local-only fallback */
    }
  }

  function handlePick(id: string, title: string) {
    setDatabaseId(id);
    saveSettings({ notionDatabaseId: id });
    void persistServerDb(id);
    setNote(`Selected “${title}”. Checking…`);
    void verify(id);
  }

  async function handleListPages() {
    setNote("Loading pages…");
    try {
      const res = await fetch("/api/notion/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok: boolean; pages?: ParentPage[]; error?: string };
      if (!data.ok) setNote(data.error ?? "Could not list pages.");
      else {
        setParentPages(data.pages ?? []);
        setNote(
          data.pages?.length
            ? "Pick the page to build under."
            : "No accessible pages — in Notion, open a page → Share → invite this integration, then retry."
        );
      }
    } catch {
      setNote("Lookup failed.");
    }
  }

  async function handleCreateDb() {
    if (!parentId.trim()) {
      setNote("Pick a parent page first.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/notion/create-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPageId: parentId.trim(), title: dbTitle.trim() || "Job Applications" }),
      });
      const data = (await res.json()) as { ok: boolean; databaseId?: string; url?: string; error?: string; hint?: string };
      if (!data.ok || !data.databaseId) {
        setNote(`Creation failed: ${data.error ?? "unknown error"}${data.hint ? ` ${data.hint}` : ""}`);
      } else {
        handlePick(data.databaseId, dbTitle.trim() || "Job Applications");
        setShowCreate(false);
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Creation failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            One choice: where new applications go. Sign out anytime from the profile at the
            bottom of the sidebar.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notion database</CardTitle>
            <CardDescription>New applications file into the selected database.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading your databases…</p>
            ) : databases.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {databases.map((d) => {
                  const selected = d.id === databaseId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handlePick(d.id, d.title)}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                        selected ? "border-primary bg-muted/50" : ""
                      }`}
                    >
                      <span className="truncate font-medium">{d.title}</span>
                      {selected ? (
                        <span className="shrink-0 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Selected
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No databases found. Share one with the integration in Notion, or create one below.
              </p>
            )}

            {!showCreate ? (
              <div>
                <Button variant="ghost" onClick={() => { setShowCreate(true); void handleListPages(); }}>
                  + Create a new database
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dbTitle">Title</Label>
                  <Input
                    id="dbTitle"
                    value={dbTitle}
                    onChange={(e) => setDbTitle(e.target.value)}
                    placeholder="Job Applications"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="parent">Build inside</Label>
                  {parentPages.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {parentPages.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setParentId(p.id)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted ${
                            parentId === p.id ? "border-primary bg-muted/50" : ""
                          }`}
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      id="parent"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      placeholder="Loading pages… or paste a notion.so URL"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleCreateDb()} disabled={creating || !parentId.trim()}>
                    {creating ? "Creating…" : "Create & select"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What gets saved</CardTitle>
            <CardDescription>For reference — the saver adapts to your schema automatically.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Company, Job Title, Status, Job URL, Application URL, Location, Source, Applied
              Date, Description, Notes. Missing properties are skipped, never error.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
