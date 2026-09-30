import { NextResponse } from "next/server";
import { flattenPageProperties, getDatabaseSchema, listRecentPages, resolveCredentialsFromRequest, workspaceFromRequest } from "@/lib/notion";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: string; databaseId?: string; pageSize?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const url = new URL(req.url);
  const qsToken = url.searchParams.get("token") ?? undefined;
  const qsDb = url.searchParams.get("databaseId") ?? undefined;
  const creds = resolveCredentialsFromRequest(req, {
    token: body.token ?? qsToken,
    databaseId: body.databaseId ?? qsDb,
  });
  if (!creds) return NextResponse.json({ ok: true, configured: false, items: [] });

  const schemaRes = await getDatabaseSchema(creds.token, creds.databaseId);
  if (!schemaRes.ok) {
    return NextResponse.json(
      { ok: false, configured: true, error: "Could not read Notion database.", items: [] },
      { status: 502 }
    );
  }
  const listRes = await listRecentPages(creds.token, creds.databaseId, body.pageSize ?? 20);
  if (!listRes.ok) {
    return NextResponse.json(
      { ok: false, configured: true, error: "Could not query Notion database.", items: [] },
      { status: 502 }
    );
  }
  const results =
    (listRes.data as { results?: Array<{ id: string; created_time: string; properties: never }> } | null)
      ?.results ?? [];
  const items = results.map((p) => {
    const flat = flattenPageProperties(p.properties as never);
    const statusProp = Object.entries((p.properties ?? {}) as Record<string, { type: string; select?: { name?: string }; status?: { name?: string } }>).find(
      ([n]) => ["status", "stage"].includes(n.toLowerCase())
    )?.[1];
    const status =
      statusProp?.type === "select"
        ? (statusProp.select?.name ?? "Applied")
        : statusProp?.type === "status"
          ? (statusProp.status?.name ?? "Applied")
          : "Applied";
    return {
      id: p.id,
      company: flat.company || "Unknown",
      title: flat.title || "Unknown role",
      jobUrl: flat.jobUrl || "",
      status,
      createdTime: p.created_time,
    };
  });
  return NextResponse.json({ ok: true, configured: true, items });
}

export async function GET(req: Request) {
  return POST(req);
}
