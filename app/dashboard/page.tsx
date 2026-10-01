"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

const STATUS_STYLES: Record<string, string> = {
  Applied: "border-sky-200 bg-sky-50 text-sky-700",
  Interview: "border-violet-200 bg-violet-50 text-violet-700",
  Assessment: "border-amber-200 bg-amber-50 text-amber-800",
  Offer: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
  Ghosted: "border-zinc-200 bg-zinc-100 text-zinc-600",
  Withdrawn: "border-zinc-200 bg-white text-zinc-500",
};

function statusClass(status: string) {
  return (
    STATUS_STYLES[status] ?? "border-border bg-muted text-muted-foreground"
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0 || !parts[0]) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
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
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/notion/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSize: 20 }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        configured: boolean;
        items: RecentItem[];
        error?: string;
      };
      setConfigured(data.configured);
      setItems(data.items ?? []);
      if (!data.ok && data.error) setMsg(data.error);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: the documented exception to set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRecent();
  }, [fetchRecent]);

  const stats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const today = items.filter(
      (i) => new Date(i.createdTime) >= startOfDay,
    ).length;
    const week = items.filter(
      (i) => new Date(i.createdTime) >= startOfWeek,
    ).length;
    const active = items.filter((i) =>
      ["Applied", "Interview", "Assessment"].includes(i.status),
    ).length;
    return { total: items.length, today, week, active };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.company.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

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
      const data = (await res.json()) as {
        ok: boolean;
        deduped?: boolean;
        error?: string;
        message?: string;
      };
      if (!data.ok) {
        setMsg(data.error ?? "Save failed.");
      } else {
        setMsg(
          data.deduped ? "Duplicate — already in Notion." : "Saved to Notion.",
        );
        setForm({
          company: "",
          title: "",
          jobUrl: "",
          location: "",
          source: "",
          description: "",
          status: "Applied",
        });
        setDialogOpen(false);
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
      <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {configured === false
                ? "No database selected — pick or create one in Settings."
                : "Recent applications synced from Notion."}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => void fetchRecent()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              {loading ? "Loading…" : "Refresh"}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={<Button className="flex-1 sm:flex-none" />}
              >
                <Plus />
                Add application
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add application</DialogTitle>
                  <DialogDescription>
                    Manually save an application when auto-detection misses one.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => void handleManualSave(e)}
                  className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-0.5"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={form.company}
                        onChange={(e) =>
                          setForm({ ...form, company: e.target.value })
                        }
                        required
                        placeholder="Google"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="title">Job title</Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        required
                        placeholder="Frontend Engineer"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="jobUrl">Job URL</Label>
                    <Input
                      id="jobUrl"
                      type="url"
                      value={form.jobUrl}
                      onChange={(e) =>
                        setForm({ ...form, jobUrl: e.target.value })
                      }
                      required
                      placeholder="https://…"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(e) =>
                          setForm({ ...form, location: e.target.value })
                        }
                        placeholder="Remote / Bengaluru"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="source">Source</Label>
                      <Input
                        id="source"
                        value={form.source}
                        onChange={(e) =>
                          setForm({ ...form, source: e.target.value })
                        }
                        placeholder="LinkedIn"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Paste the job description…"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as ApplicationStatus,
                        })
                      }
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <DialogFooter className="mx-0 mb-0 bg-transparent p-0 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      <Send />
                      {saving ? "Saving…" : "Save application"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <Card size="sm" className="min-w-0 gap-1">
            <CardContent className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-9">
                <Briefcase className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg leading-none font-semibold sm:text-xl">
                  {loading ? "–" : stats.total}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  Total tracked
                </span>
              </span>
            </CardContent>
          </Card>
          <Card size="sm" className="min-w-0 gap-1">
            <CardContent className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 sm:size-9">
                <CalendarDays className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg leading-none font-semibold sm:text-xl">
                  {loading ? "–" : stats.today}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  Applied today
                </span>
              </span>
            </CardContent>
          </Card>
          <Card size="sm" className="min-w-0 gap-1">
            <CardContent className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 sm:size-9">
                <Clock3 className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg leading-none font-semibold sm:text-xl">
                  {loading ? "–" : stats.week}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  This week
                </span>
              </span>
            </CardContent>
          </Card>
          <Card size="sm" className="min-w-0 gap-1">
            <CardContent className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-700 sm:size-9">
                <Building2 className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg leading-none font-semibold sm:text-xl">
                  {loading ? "–" : stats.active}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  In pipeline
                </span>
              </span>
            </CardContent>
          </Card>
        </div>

        {msg ? (
          <p className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm break-words text-muted-foreground">
            {msg}
          </p>
        ) : null}

        {/* Recent applications */}
        <Card className="min-w-0">
          <CardHeader className="flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">
                Recent applications
              </CardTitle>
              <CardDescription>
                Latest 20 records from your Notion database.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit shrink-0">
              {filtered.length} / {items.length}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search company or role…"
                  className="pl-8"
                />
              </div>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:h-8 sm:w-40"
              >
                <option value="All">All statuses</option>
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border px-3 py-3"
                  >
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/30 px-4 py-10 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-muted">
                  <Briefcase className="size-5 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-sm font-medium">No applications yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Apply on a job site with the extension, or add your first
                    application manually.
                  </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus />
                  Add application
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No matches for “{query}”
                {statusFilter !== "All" ? ` in ${statusFilter}` : ""}.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {filtered.map((item) => (
                  <li
                    key={item.id}
                    className="group flex min-w-0 flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20 hover:bg-muted/40 sm:flex-nowrap"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                      {initials(item.company)}
                    </span>
                    <div className="order-2 min-w-0 flex-1 basis-full sm:order-none sm:basis-auto">
                      <p className="truncate text-sm font-medium">
                        {item.company}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs break-words text-muted-foreground">
                        <span className="shrink-0">
                          {timeAgo(item.createdTime)}
                        </span>
                        {item.jobUrl ? (
                          <>
                            <span aria-hidden>·</span>
                            <a
                              href={item.jobUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-w-0 items-center gap-0.5 underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View job
                              <ArrowUpRight className="size-3 shrink-0" />
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`order-1 ml-auto shrink-0 sm:order-none sm:ml-0 ${statusClass(item.status)}`}
                    >
                      {item.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
