export const APPLY_BUTTON_PATTERNS = [
  "apply",
  "apply now",
  "easy apply",
  "apply for this job",
  "submit application",
  "apply for job",
  "quick apply",
  "1-click apply",
  "one-click apply",
];

export const SUCCESS_MESSAGE_PATTERNS = [
  "application submitted",
  "application received",
  "thank you for applying",
  "thanks for applying",
  "successfully applied",
  "we've received your application",
  "we have received your application",
  "your application has been submitted",
  "your application was submitted",
  "application complete",
  "you have applied",
  "you've applied",
  "applied successfully",
];

export const JOB_BOARD_SOURCES: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "greenhouse.io": "Greenhouse",
  "lever.co": "Lever",
  "myworkdayjobs.com": "Workday",
  "workday.com": "Workday",
  "ashbyhq.com": "Ashby",
  "jobs.ashbyhq.com": "Ashby",
  "indeed.com": "Indeed",
  "glassdoor.com": "Glassdoor",
  "wellfound.com": "Wellfound",
  "angel.co": "Wellfound",
  "dice.com": "Dice",
  "monster.com": "Monster",
  "ziprecruiter.com": "ZipRecruiter",
  "naukri.com": "Naukri",
  "foundit.in": "Foundit",
  "cutshort.io": "Cutshort",
};

export function detectSource(hostname: string, url: string): string {
  const host = hostname.toLowerCase();
  for (const [domain, name] of Object.entries(JOB_BOARD_SOURCES)) {
    if (host.includes(domain)) return name;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return host;
  }
}
