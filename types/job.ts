export type ApplicationStatus =
  | "Applied"
  | "Interview"
  | "Assessment"
  | "Offer"
  | "Rejected"
  | "Ghosted"
  | "Withdrawn";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Applied",
  "Interview",
  "Assessment",
  "Offer",
  "Rejected",
  "Ghosted",
  "Withdrawn",
];

export interface JobDetails {
  company: string;
  title: string;
  location?: string;
  jobUrl: string;
  applicationUrl?: string;
  source?: string;
  /** Plain-text job description, capped at 4000 chars at the collection point. */
  description?: string;
}

export interface ApplicationRecord extends JobDetails {
  id?: string;
  status: ApplicationStatus;
  appliedDate: string; // ISO
  notes?: string;
  confidence?: "high" | "low";
  createdAt?: string;
}

export interface DetectedJob extends JobDetails {
  confidence: "high" | "low";
}
