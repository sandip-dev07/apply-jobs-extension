"use client";

export interface TrackerSettings {
  notionDatabaseId: string;
}

const KEY = "job-tracker-settings-v1";

export function loadSettings(): TrackerSettings {
  if (typeof window === "undefined") return { notionDatabaseId: "" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { notionDatabaseId: "" };
    const parsed = JSON.parse(raw) as Partial<TrackerSettings>;
    // Tolerate settings shapes from older versions.
    const legacyDb =
      (parsed as Record<string, unknown>).notionDatabaseId ??
      (parsed as Record<string, unknown>).databaseId;
    return { notionDatabaseId: typeof legacyDb === "string" ? legacyDb.trim() : "" };
  } catch {
    return { notionDatabaseId: "" };
  }
}

export function saveSettings(s: TrackerSettings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function clearSettings() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
