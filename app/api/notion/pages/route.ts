import { NextResponse } from "next/server";
import { readCookie, resolveUserToken, searchPages, NOTION_TOKEN_COOKIE } from "@/lib/notion";

export const runtime = "nodejs";

/** POST /api/notion/pages { token? } → pages the login can see (pick one as a database parent). */
export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const token = resolveUserToken(req, body.token);
  if (!token) return NextResponse.json({ ok: false, error: "Sign in with Notion first." }, { status: 401 });
  const res = await searchPages(token);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: (res.data as { message?: string } | null)?.message ?? "Search failed" },
      { status: 502 }
    );
  }
  const results =
    (res.data as { results?: Array<{ id: string; url?: string; parent?: { type?: string }; properties?: Record<string, { type: string; title?: Array<{ plain_text?: string }> }> }> } | null)?.results ?? [];
  // Database rows are page objects too — only real pages (workspace or page
  // children) make sense as a parent for a new database.
  const pages = results.filter(
    (p) => p.parent?.type === "workspace" || p.parent?.type === "page_id"
  );
  return NextResponse.json({
    ok: true,
    pages: pages.map((p) => {
      const titleProp = Object.values(p.properties ?? {}).find((v) => v.type === "title");
      return {
        id: p.id,
        url: (p.url as string) ?? "",
        title:
          titleProp?.title?.map((t) => t.plain_text ?? "").join("") || "(untitled page)",
      };
    }),
  });
}
