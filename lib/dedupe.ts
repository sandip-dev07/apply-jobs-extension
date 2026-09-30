import type { JobDetails } from "@/types/job";

/** Normalize a job URL for duplicate comparison: lowercase host, strip tracking params, hash, trailing slash. */
export function normalizeJobUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    const strip = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
      "mc_cid",
      "mc_eid",
      "_ga",
      "ref",
      "referral",
      "source",
    ]);
    for (const key of [...u.searchParams.keys()]) {
      if (strip.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

export function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function dedupeKey(job: Pick<JobDetails, "jobUrl" | "company" | "title">): string {
  return [normalizeJobUrl(job.jobUrl), normalizeText(job.company), normalizeText(job.title)].join(
    "|"
  );
}

export function isDuplicate(
  candidate: Pick<JobDetails, "jobUrl" | "company" | "title">,
  existing: Array<Pick<JobDetails, "jobUrl" | "company" | "title">>
): boolean {
  const key = dedupeKey(candidate);
  return existing.some((e) => dedupeKey(e) === key);
}
