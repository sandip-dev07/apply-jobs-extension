import { NextResponse } from "next/server";
import {
  createDatabase,
  extractNotionId,
  readCookie,
  NOTION_TOKEN_COOKIE,
} from "@/lib/notion";

export const runtime = "nodejs";

const isProd = process.env.NODE_ENV === "production";

/**
 * POST /api/notion/create-db { parentPageId, title? } — creates a Job Applications
 * database with the tracker schema inside a page, then remembers it server-side.
 * (Notion only allows database creation as the child of an existing page.)
 */
export async function POST(req: Request) {
  let body: { parentPageId?: string; title?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const token =
    readCookie(req, NOTION_TOKEN_COOKIE) || process.env.NOTION_TOKEN?.trim() || "";
  if (!token) return NextResponse.json({ ok: false, error: "Sign in with Notion first." }, { status: 401 });

  const parentId = body.parentPageId ? extractNotionId(body.parentPageId) : null;
  if (!parentId) {
    return NextResponse.json(
      { ok: false, error: "Pick a parent page first — paste its Notion URL or pick from the list." },
      { status: 400 }
    );
  }
  const res = await createDatabase(token, parentId, (body.title ?? "").trim() || "Job Applications");
  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: (res.data as { message?: string } | null)?.message ?? "Database creation failed",
        hint: "The parent page must be shared with this integration, and the integration needs Insert-content capability.",
      },
      { status: 502 }
    );
  }
  const data = res.data as { id?: string; url?: string } | null;
  const out = NextResponse.json({ ok: true, databaseId: data?.id ?? null, url: data?.url ?? null });
  if (data?.id) {
    out.cookies.set("nt_db", data.id, {
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return out;
}
