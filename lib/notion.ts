import { normalizeJobUrl } from "@/lib/dedupe";
import type { ApplicationRecord } from "@/types/job";

const NOTION_VERSION = "2022-06-28";
const NOTION_API = "https://api.notion.com/v1";

export interface NotionCredentials {
  token: string;
  databaseId: string;
}

export const NOTION_TOKEN_COOKIE = "nt_token";
export const NOTION_DB_COOKIE = "nt_db";
export const NOTION_WORKSPACE_COOKIE = "nt_workspace";
const NOTION_STATE_COOKIE = "nt_state";

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * Credentials with login-cookie fallback: explicit request values first,
 * then the OAuth login cookies, then env vars.
 */
export function resolveCredentialsFromRequest(
  req: Request,
  input?: Partial<NotionCredentials>
): NotionCredentials | null {
  return resolveCredentials({
    token: input?.token?.trim() || readCookie(req, NOTION_TOKEN_COOKIE) || undefined,
    databaseId:
      input?.databaseId?.trim() || readCookie(req, NOTION_DB_COOKIE) || undefined,
  });
}

export function workspaceFromRequest(req: Request): string | null {
  return readCookie(req, NOTION_WORKSPACE_COOKIE);
}

export function readStateCookie(req: Request): string | null {
  return readCookie(req, NOTION_STATE_COOKIE);
}

/** Resolve credentials: explicit values first, then env. Returns null when missing. */
export function resolveCredentials(input?: Partial<NotionCredentials>): NotionCredentials | null {
  const token =
    input?.token?.trim() ||
    process.env.NOTION_TOKEN?.trim() ||
    process.env.NOTION_API_KEY?.trim() ||
    "";
  const rawDb =
    input?.databaseId?.trim() || process.env.NOTION_DATABASE_ID?.trim() || "";
  // Accept full Notion URLs too: extract 32-hex-char id.
  const m = rawDb.match(/[0-9a-f]{32}/i) ?? rawDb.match(/[0-9a-f-]{36}/i);
  const databaseId = m ? m[0] : rawDb;
  if (!token || !databaseId) return null;
  return { token, databaseId: databaseId.replace(/-/g, "") ? databaseId : databaseId };
}

async function notionFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

interface DbProperty {
  id: string;
  name: string;
  type: string;
}

export async function getDatabaseSchema(token: string, databaseId: string) {
  return notionFetch(token, `/databases/${databaseId}`);
}

/** List databases shared with the integration (for the settings picker). */
export async function searchDatabases(token: string) {
  return notionFetch(token, "/search", {
    method: "POST",
    body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 50 }),
  });
}

/** List pages shared with the integration (candidate parents for a new database). */
export async function searchPages(token: string) {
  return notionFetch(token, "/search", {
    method: "POST",
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 25,
    }),
  });
}

/** Extract a 32-hex Notion ID from a raw ID or full notion.so URL. */
export function extractNotionId(input: string): string | null {
  const m =
    input.match(/[0-9a-f]{32}/i) ?? input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

const STATUS_COLORS: Record<string, string> = {
  Applied: "blue",
  Interview: "purple",
  Assessment: "yellow",
  Offer: "green",
  Rejected: "red",
  Ghosted: "gray",
  Withdrawn: "default",
};

/** The Job Tracker schema used when creating a database from the app. */
export function jobTrackerSchema() {
  return {
    Name: { title: {} },
    Company: { rich_text: {} },
    "Job Title": { rich_text: {} },
    Description: { rich_text: {} },
    Status: {
      select: {
        options: Object.entries(STATUS_COLORS).map(([name, color]) => ({ name, color })),
      },
    },
    "Job URL": { url: {} },
    "Application URL": { url: {} },
    Location: { rich_text: {} },
    Source: { rich_text: {} },
    "Applied Date": { date: {} },
    Notes: { rich_text: {} },
  };
}

/** Create a database with the tracker schema as a child of a page. */
export async function createDatabase(token: string, parentPageId: string, title: string) {
  return notionFetch(token, "/databases", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: title.slice(0, 100) || "Job Applications" } }],
      properties: jobTrackerSchema(),
    }),
  });
}

function findProp(
  props: Record<string, DbProperty>,
  candidates: string[]
): { name: string; def: DbProperty } | null {
  const lower = new Map(Object.entries(props).map(([n, d]) => [n.toLowerCase(), { name: n, def: d }]));
  for (const c of candidates) {
    const hit = lower.get(c.toLowerCase());
    if (hit) return hit;
  }
  // fuzzy: contains
  for (const c of candidates) {
    for (const [lname, v] of lower) {
      if (lname.includes(c.toLowerCase()) || c.toLowerCase().includes(lname)) return v;
    }
  }
  return null;
}

function toRichText(value: string) {
  return [{ type: "text", text: { content: value.slice(0, 2000) } }];
}

/**
 * Build Notion page properties by inspecting the target database schema.
 * Only sets properties that actually exist — safe against custom schemas.
 */
export function buildProperties(
  schemaProps: Record<string, DbProperty>,
  app: ApplicationRecord
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const titleProp = Object.entries(schemaProps).find(([, d]) => d.type === "title")?.[0];

  const setText = (propName: string | undefined, value: string | undefined) => {
    if (!propName || !value) return;
    const def = schemaProps[propName];
    if (!def) return;
    if (def.type === "title") properties[propName] = { title: toRichText(value) };
    else if (def.type === "rich_text") properties[propName] = { rich_text: toRichText(value) };
    else if (def.type === "url") {
      try {
        new URL(value);
        properties[propName] = { url: value.slice(0, 2000) };
      } catch {
        /* not a URL — skip */
      }
    } else if (def.type === "select") properties[propName] = { select: { name: value.slice(0, 100) } };
    else if (def.type === "status") properties[propName] = { status: { name: value.slice(0, 100) } };
    else if (def.type === "phone_number") properties[propName] = { phone_number: value.slice(0, 200) };
  };

  // Company -> title property if it looks like the company field, else first title prop.
  const companyProp =
    findProp(schemaProps, ["company", "organization", "employer"])?.name ?? titleProp;
  const roleProp = findProp(schemaProps, ["job title", "role", "position", "title", "job"] )?.name;

  // If the title prop is the role field, company goes to a rich_text field instead.
  if (companyProp && roleProp && companyProp === roleProp) {
    setText(companyProp, `${app.company} — ${app.title}`);
  } else {
    setText(companyProp, app.company || "Unknown company");
    if (roleProp && roleProp !== companyProp) setText(roleProp, app.title || "Unknown role");
    else if (titleProp && titleProp !== companyProp) setText(titleProp, app.title);
  }

  setText(findProp(schemaProps, ["status", "stage"])?.name, app.status);
  setText(findProp(schemaProps, ["location", "place"])?.name, app.location ?? "");
  setText(findProp(schemaProps, ["source", "platform", "board", "channel"])?.name, app.source ?? "");
  // Job description: prefer a dedicated Description property, else merge into Notes.
  const notesProp = findProp(schemaProps, ["notes", "note", "comments", "comment"])?.name;
  const descValue = (app.description ?? "").trim();
  const descProp = findProp(schemaProps, [
    "job description",
    "description",
    "jd",
    "about the role",
    "role description",
  ])?.name;
  const titleClaimed = titleProp !== undefined && titleProp in properties;
  if (descValue && descProp && descProp !== notesProp && !(descProp === titleProp && titleClaimed)) {
    setText(descProp, descValue);
    setText(notesProp, app.notes ?? "");
  } else {
    const merged = [app.notes?.trim(), descValue].filter(Boolean).join("\n\n");
    setText(notesProp, merged);
  }

  const jobUrlProp = findProp(schemaProps, ["job url", "job link", "listing url", "url", "link"])?.name;
  if (jobUrlProp) {
    const def = schemaProps[jobUrlProp];
    if (def.type === "url") {
      try {
        new URL(app.jobUrl);
        properties[jobUrlProp] = { url: app.jobUrl.slice(0, 2000) };
      } catch { /* skip */ }
    } else setText(jobUrlProp, app.jobUrl);
  }
  setText(
    findProp(schemaProps, ["application url", "applied url", "application link"])?.name,
    app.applicationUrl ?? ""
  );

  const dateProp = findProp(schemaProps, ["applied date", "applied", "date applied", "date"])?.name;
  if (dateProp && schemaProps[dateProp]?.type === "date" && app.appliedDate) {
    const iso = new Date(app.appliedDate).toISOString().slice(0, 10);
    if (!Number.isNaN(Date.parse(iso))) properties[dateProp] = { date: { start: iso } };
  }

  // Fill the database's title property (e.g. "Name") when nothing else claimed it,
  // so rows are identifiable in the table view instead of blank.
  if (titleProp && !(titleProp in properties)) {
    properties[titleProp] = {
      title: toRichText(`${app.company} — ${app.title}`.slice(0, 2000)),
    };
  }

  return properties;
}

/** Check for an existing page with the same normalized job URL (duplicate prevention). */
export async function findDuplicatePage(
  token: string,
  databaseId: string,
  schemaProps: Record<string, DbProperty>,
  app: Pick<ApplicationRecord, "jobUrl" | "company" | "title">
): Promise<string | null> {
  const jobUrlProp =
    findProp(schemaProps, ["job url", "job link", "listing url", "url", "link"])?.name ?? null;

  // Strategy 1: query by exact job URL if the property is a url type.
  if (jobUrlProp && schemaProps[jobUrlProp]?.type === "url") {
    const res = await notionFetch(token, `/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({ filter: { property: jobUrlProp, url: { equals: app.jobUrl } }, page_size: 5 }),
    });
    const results = (res.data as { results?: Array<{ id: string }> } | null)?.results;
    if (res.ok && results && results.length > 0) return results[0].id;
  }

  // Strategy 2: fetch recent pages and compare normalized key client-side.
  const res = await notionFetch(token, `/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: 100, sorts: [{ timestamp: "created_time", direction: "descending" }] }),
  });
  if (!res.ok) return null;
  const results = (res.data as { results?: Array<{ id: string; properties: Record<string, never> }> } | null)?.results ?? [];
  const targetUrl = normalizeJobUrl(app.jobUrl);
  const targetCompany = app.company.trim().toLowerCase();
  const targetTitle = app.title.trim().toLowerCase();
  for (const page of results) {
    const flat = flattenPageProperties(page.properties as Record<string, { type: string; [k: string]: unknown }>);
    const urlMatch = flat.jobUrl && normalizeJobUrl(flat.jobUrl) === targetUrl;
    const coTitleMatch =
      flat.company.toLowerCase() === targetCompany && flat.title.toLowerCase() === targetTitle;
    if (urlMatch || (flat.company && flat.title && coTitleMatch)) return page.id;
  }
  return null;
}

export function flattenPageProperties(
  props: Record<string, { type: string; [k: string]: unknown }>
): { company: string; title: string; jobUrl: string; [k: string]: string } {
  const texts: string[] = [];
  let jobUrl = "";
  const getText = (p: { type: string; [k: string]: unknown }): string => {
    if (p.type === "title" || p.type === "rich_text") {
      const arr = (p[p.type] as Array<{ plain_text?: string; text?: { content: string } }>) ?? [];
      return arr.map((t) => t.plain_text ?? t.text?.content ?? "").join("");
    }
    if (p.type === "url") return (p.url as string) ?? "";
    if (p.type === "select") return ((p.select as { name?: string } | null)?.name ?? "") as string;
    if (p.type === "status") return ((p.status as { name?: string } | null)?.name ?? "") as string;
    if (p.type === "date") return ((p.date as { start?: string } | null)?.start ?? "") as string;
    return "";
  };
  for (const [name, p] of Object.entries(props ?? {})) {
    const v = getText(p);
    const ln = name.toLowerCase();
    if (ln.includes("job") && (ln.includes("url") || ln.includes("link"))) jobUrl = jobUrl || v;
    else if (ln === "url" || ln === "link") jobUrl = jobUrl || v;
    texts.push(`${name}: ${v}`);
    void texts;
  }
  // Heuristic: first title prop -> company or "company — title" combo.
  const titleProps = Object.entries(props ?? {}).filter(([, p]) => p.type === "title");
  const firstTitle = titleProps.length > 0 ? getText(titleProps[0][1]) : "";
  let company = "";
  let title = "";
  if (firstTitle.includes("—")) {
    const [c, ...rest] = firstTitle.split("—");
    company = c.trim();
    title = rest.join("—").trim();
  } else {
    company = firstTitle;
  }
  // Look for explicit role prop.
  for (const [name, p] of Object.entries(props ?? {})) {
    const ln = name.toLowerCase();
    if (["job title", "role", "position", "title"].includes(ln)) {
      const v = getText(p);
      if (v) title = v;
    }
    if (["company", "organization", "employer"].includes(ln)) {
      const v = getText(p);
      if (v) company = v;
    }
  }
  return { company, title, jobUrl, _raw: "" };
}

export async function createNotionPage(
  token: string,
  databaseId: string,
  properties: Record<string, unknown>
) {
  return notionFetch(token, "/pages", {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });
}

export async function listRecentPages(token: string, databaseId: string, pageSize = 20) {
  return notionFetch(token, `/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: Math.min(Math.max(pageSize, 1), 50),
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    }),
  });
}
