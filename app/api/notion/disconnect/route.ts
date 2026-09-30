import { NextResponse } from "next/server";
import { appOrigin } from "../auth/route";

export const runtime = "nodejs";

/** GET /api/notion/disconnect — clear the login cookies and return to Settings. */
export async function GET(req: Request) {
  const res = NextResponse.redirect(`${appOrigin(req)}/settings`);
  for (const name of ["nt_token", "nt_workspace", "nt_db"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}
