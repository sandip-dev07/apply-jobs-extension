import { NextResponse } from "next/server";

export const runtime = "nodejs";

const isProd = process.env.NODE_ENV === "production";

export function appOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return configured || new URL(req.url).origin;
}

/** Allow only same-origin paths as post-login destinations (no open redirects). */
export function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return null;
  return value;
}

/** GET /api/notion/auth[?next=/dashboard] → redirect to Notion's OAuth consent screen. */
export async function GET(req: Request) {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "OAuth is not configured. Set NOTION_OAUTH_CLIENT_ID (and SECRET) and register the redirect URI in your Notion integration.",
      },
      { status: 500 }
    );
  }
  const redirectUri = `${appOrigin(req)}/api/notion/callback`;
  const state = crypto.randomUUID();
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("nt_state", state, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  if (next) {
    res.cookies.set("nt_next", next, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }
  return res;
}
