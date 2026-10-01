"use client";

export interface TrackerSettings {
  notionDatabaseId: string;
}

const KEY = "docket-settings-v1";
// Previous key name — read once and migrate so existing installs keep their pick.
const LEGACY_KEY = "job-tracker-settings-v1";

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadSettings(): TrackerSettings {
  if (typeof window === "undefined") return { notionDatabaseId: "" };
  try {
    const raw = readRaw(KEY) ?? readRaw(LEGACY_KEY);
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
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage unavailable */
  }
}
