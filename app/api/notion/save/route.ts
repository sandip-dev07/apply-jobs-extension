import { NextResponse } from "next/server";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types/job";
import { normalizeJobUrl } from "@/lib/dedupe";
import {
  buildProperties,
  createNotionPage,
  findDuplicatePage,
  getDatabaseSchema,
  resolveCredentialsFromRequest,
} from "@/lib/notion";

export const runtime = "nodejs";

interface SaveBody {
  company?: string;
  title?: string;
  jobTitle?: string;
  location?: string;
  jobUrl?: string;
  applicationUrl?: string;
  source?: string;
  status?: string;
  appliedDate?: string;
  notes?: string;
  description?: string;
  token?: string;
  databaseId?: string;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return bad("Invalid JSON body.");
  }

  const creds = resolveCredentialsFromRequest(req, { token: body.token, databaseId: body.databaseId });
  if (!creds) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Notion is not configured. Provide a token + database ID in the request or set NOTION_TOKEN and NOTION_DATABASE_ID env vars.",
        code: "NOT_CONFIGURED",
      },
      { status: 428 }
    );
  }

  const company = body.company?.trim() || "";
  const title = (body.title ?? body.jobTitle ?? "").trim();
  const jobUrl = body.jobUrl?.trim() || "";
  if (!company || !title || !jobUrl) {
    return bad("Missing required fields: company, title/jobTitle, jobUrl.");
  }
  try {
    new URL(jobUrl);
  } catch {
    return bad("jobUrl must be a valid URL.");
  }

  const status: ApplicationStatus = APPLICATION_STATUSES.includes(body.status as ApplicationStatus)
    ? (body.status as ApplicationStatus)
    : "Applied";

  const app = {
    company,
    title,
    location: body.location?.trim() || "",
    description: (body.description ?? "").trim().slice(0, 4000),
    jobUrl,
    applicationUrl: body.applicationUrl?.trim() || jobUrl,
    source: body.source?.trim() || "",
    status,
    appliedDate: body.appliedDate || new Date().toISOString(),
    notes: body.notes?.trim() || "",
  };

  // 1. Fetch schema (needed for flexible property mapping + duplicate check).
  const schemaRes = await getDatabaseSchema(creds.token, creds.databaseId);
  if (!schemaRes.ok) {
    const err = (schemaRes.data as { message?: string } | null)?.message ?? "Unknown Notion error";
    return NextResponse.json(
      { ok: false, error: `Notion database lookup failed (HTTP ${schemaRes.status}): ${err}` },
      { status: 502 }
    );
  }
  const schemaProps = ((schemaRes.data as { properties?: Record<string, { id: string; name: string; type: string }> } | null)
    ?.properties ?? {}) as Record<string, { id: string; name: string; type: string }>;

  // 2. Duplicate prevention: normalized URL + company + title.
  const duplicateId = await findDuplicatePage(creds.token, creds.databaseId, schemaProps, {
    jobUrl: app.jobUrl,
    company: app.company,
    title: app.title,
  });
  if (duplicateId) {
    return NextResponse.json({
      ok: true,
      deduped: true,
      pageId: duplicateId,
      key: [normalizeJobUrl(app.jobUrl), app.company.toLowerCase(), app.title.toLowerCase()].join("|"),
      message: "Duplicate detected — record already exists in Notion.",
    });
  }

  // 3. Create the page.
  const properties = buildProperties(schemaProps, app);
  const createRes = await createNotionPage(creds.token, creds.databaseId, properties);
  if (!createRes.ok) {
    const err = (createRes.data as { message?: string; code?: string } | null)?.message ?? "Unknown Notion error";
    return NextResponse.json(
      { ok: false, error: `Notion page creation failed (HTTP ${createRes.status}): ${err}`, details: createRes.data },
      { status: 502 }
    );
  }
  const pageId = (createRes.data as { id?: string } | null)?.id ?? null;
  return NextResponse.json({ ok: true, deduped: false, pageId, message: "Saved to Notion." });
}
