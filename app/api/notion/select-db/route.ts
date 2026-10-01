import { NextResponse } from "next/server";
import {
  getDatabaseSchema,
  resolveCredentialsFromRequest,
} from "@/lib/notion";

export const runtime = "nodejs";

const isProd = process.env.NODE_ENV === "production";

/**
 * POST /api/notion/select-db { databaseId? } — remembers the database server-side
 * (verified against the API first) so logged-in users don't need to resend it.
 */
export async function POST(req: Request) {
  let body: { databaseId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const creds = resolveCredentialsFromRequest(req, { databaseId: body.databaseId });
  if (!creds?.token) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  if (!body.databaseId?.trim()) {
    const res = NextResponse.json({ ok: true, cleared: true });
    res.cookies.set("nt_db", "", { path: "/", maxAge: 0 });
    return res;
  }
  const schema = await getDatabaseSchema(creds.token, creds.databaseId);
  if (!schema.ok) {
    return NextResponse.json(
      { ok: false, error: "That database is not reachable with this login. Share it with the integration first." },
      { status: 400 }
    );
  }
  const res = NextResponse.json({ ok: true, databaseId: body.databaseId.trim() });
  res.cookies.set("nt_db", body.databaseId.trim(), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
