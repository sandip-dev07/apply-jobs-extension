"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types/job";
import { AppShell } from "@/components/app-shell";

interface RecentItem {
  id: string;
  company: string;
  title: string;
  jobUrl: string;
  status: string;
  createdTime: string;
}

export default function DashboardPage() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(0);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    company: "",
    title: "",
    jobUrl: "",
    location: "",
    source: "",
    description: "",
    status: "Applied" as ApplicationStatus,
  });
  const [saving, setSaving] = useState(false);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/notion/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSize: 20 }),
      });
      const data = (await res.json()) as { ok: boolean; configured: boolean; items: RecentItem[]; error?: string };
      setConfigured(data.configured);
      setItems(data.items ?? []);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      setToday((data.items ?? []).filter((i) => new Date(i.createdTime) >= startOfDay).length);
      if (!data.ok && data.error) setMsg(data.error);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecent();
  }, [fetchRecent]);

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/notion/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company,
          title: form.title,
          jobUrl: form.jobUrl,
          location: form.location,
          source: form.source,
          description: form.description,
          status: form.status,
          appliedDate: new Date().toISOString(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; deduped?: boolean; error?: string; message?: string };
      if (!data.ok) {
        setMsg(data.error ?? "Save failed.");
      } else {
        setMsg(data.deduped ? "Duplicate — already in Notion." : "Saved to Notion.");
        setForm({ company: "", title: "", jobUrl: "", location: "", source: "", description: "", status: "Applied" });
        void fetchRecent();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {configured === false
              ? "No database selected — pick or create one in Settings."
              : "Recent applications synced from Notion."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Today: {today}</Badge>
          <Badge>Total: {items.length}</Badge>
          <Button size="sm" variant="outline" onClick={() => void fetchRecent()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
            <CardDescription>Latest 20 records from your Notion database.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No applications yet. Apply on a job site with the extension, or add one manually.
              </p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.company}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.title}</p>
                  </div>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Save manually</CardTitle>
            <CardDescription>Fallback when auto-detection misses an application.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleManualSave(e)} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required placeholder="Google" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title">Job title</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Frontend Engineer" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jobUrl">Job URL</Label>
                <Input id="jobUrl" type="url" value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} required placeholder="https://…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Remote / Bengaluru" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="source">Source</Label>
                  <Input id="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="LinkedIn" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Paste the job description…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>                <select
                  id="status"
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })}
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
    </AppShell>
  );
}
