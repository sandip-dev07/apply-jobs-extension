import { NextResponse } from "next/server";
import { getDatabaseSchema, readCookie, resolveCredentialsFromRequest, searchDatabases, workspaceFromRequest, NOTION_TOKEN_COOKIE } from "@/lib/notion";

export const runtime = "nodejs";

/** GET /api/notion/status → checks request/cookie/env credentials and verifies the database. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const creds = resolveCredentialsFromRequest(req, {
    token: url.searchParams.get("token") ?? undefined,
    databaseId: url.searchParams.get("databaseId") ?? undefined,
  });
  const loggedIn = !!readCookie(req, NOTION_TOKEN_COOKIE);
  const workspace = workspaceFromRequest(req);
  if (!creds) {
    return NextResponse.json({
      ok: true,
      configured: false,
      loggedIn,
      workspace,
      message: "Notion credentials not provided. Sign in or set them in Settings.",
    });
  }
  const res = await getDatabaseSchema(creds.token, creds.databaseId);
  if (!res.ok) {
    const notionErr = res.data as { message?: string; code?: string } | null;
    const hint =
      notionErr?.code === "object_not_found"
        ? "Fix: in Notion, open the database as a full page → Share → invite this integration, then re-test. Also confirm the ID belongs to the database itself, not a regular page."
        : undefined;
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        loggedIn,
        workspace,
        reachable: false,
        error: notionErr?.message ?? "Database unreachable",
        hint,
      },
      { status: 502 }
    );
  }
  const data = res.data as { title?: Array<{ plain_text?: string }>; properties?: Record<string, unknown> } | null;
  return NextResponse.json({
    ok: true,
    configured: true,
    loggedIn,
    workspace,
    reachable: true,
    databaseTitle: data?.title?.map((t) => t.plain_text ?? "").join("") ?? "",
    propertyNames: Object.keys(data?.properties ?? {}),
  });
}

/** POST /api/notion/databases { token? } → list databases (login cookie works too). */
export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const token =
    body.token?.trim() ||
    readCookie(req, NOTION_TOKEN_COOKIE) ||
    process.env.NOTION_TOKEN?.trim() ||
    "";
  if (!token) return NextResponse.json({ ok: false, error: "Sign in with Notion first, or provide a token." }, { status: 401 });
  const res = await searchDatabases(token);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: (res.data as { message?: string } | null)?.message ?? "Search failed" },
      { status: 502 }
    );
  }
  const results =
    (res.data as { results?: Array<{ id: string; title?: Array<{ plain_text?: string }> }> } | null)?.results ?? [];
  return NextResponse.json({
    ok: true,
    databases: results.map((d) => ({
      id: d.id,
      title: d.title?.map((t) => t.plain_text ?? "").join("") || "(untitled)",
    })),
  });
}
