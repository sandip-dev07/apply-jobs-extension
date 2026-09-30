import { NextResponse } from "next/server";
import { readCookie } from "@/lib/notion";
import { appOrigin, safeNext } from "../auth/route";

export const runtime = "nodejs";

const isProd = process.env.NODE_ENV === "production";
const YEAR = 60 * 60 * 24 * 365;

/** GET /api/notion/callback — Notion redirects here after consent. Exchanges the code for a token. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/settings?error=${encodeURIComponent(message)}`);

  const url = new URL(req.url);
  const denied = url.searchParams.get("error");
  if (denied) return fail(`Notion refused access (${denied}).`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stored = readCookie(req, "nt_state");
  if (!code || !state || !stored || state !== stored) {
    return fail("Login session expired or mismatched. Please try signing in again.");
  }

  const clientId = process.env.NOTION_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return fail("OAuth is not configured on this server (missing client ID/secret).");
  }

  const redirectUri = `${origin}/api/notion/callback`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  interface TokenResponse {
    access_token?: string;
    workspace_name?: string;
    message?: string;
  }
  let data: TokenResponse | null = null;
  try {
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    data = (await tokenRes.json()) as TokenResponse;
    if (!tokenRes.ok || !data?.access_token) {
      return fail(data?.message ?? `Token exchange failed (HTTP ${tokenRes.status}).`);
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not reach Notion.");
  }

  const next = safeNext(readCookie(req, "nt_next"));
  const destination =
    next && next !== "/settings" ? next : `${origin}/settings?connected=1`;
  const res = NextResponse.redirect(destination);
  res.cookies.set("nt_token", data.access_token as string, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  if (data.workspace_name) {
    res.cookies.set("nt_workspace", data.workspace_name, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: YEAR,
    });
  }
  res.cookies.set("nt_state", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("nt_next", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
