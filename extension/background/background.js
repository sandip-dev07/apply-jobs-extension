/* Job Application Tracker — background service worker (MV3, vanilla JS).
 * Holds settings + application log in extension local storage, forwards saves to the Next.js backend
 * so the Notion token stays out of page contexts. Extension storage is still user-local (personal MVP).
 */
"use strict";

// Cross-browser API: Firefox exposes promise-based `browser.*`, Chrome exposes `chrome.*`.
var ext = (typeof browser !== "undefined" && browser && browser.runtime) ? browser : chrome;

var DEFAULT_STATE = {
  settings: {
    databaseId: "",
    backendUrlOverride: "",
  },
  applications: [], // {company,title,jobUrl,applicationUrl,location,source,status,appliedDate,confidence,savedAt,pageId,deduped}
  appliedKeys: [], // dedupe keys: normalizedUrl|company|title
  pending: null, // low-confidence detection awaiting Save/Ignore
  currentJob: null,
  lastStatus: "idle",
};

function normalizeJobUrl(url) {
  try {
    var u = new URL(String(url || "").trim());
    u.hash = "";
    var strip = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
      "ref",
      "referral",
      "source",
    ];
    strip.forEach(function (k) {
      u.searchParams.delete(k);
    });
    var path = u.pathname.replace(/\/+$/, "") || "/";
    return (
      u.protocol +
      "//" +
      u.hostname.toLowerCase() +
      path +
      u.search
    ).toLowerCase();
  } catch (e) {
    return String(url || "")
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "");
  }
}

function dedupeKey(job) {
  var c = String(job.company || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  var t = String(job.title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return normalizeJobUrl(job.jobUrl || "") + "|" + c + "|" + t;
}

function getState() {
  return ext.storage.local.get(DEFAULT_STATE).then(function (s) {
    return Object.assign({}, DEFAULT_STATE, s);
  });
}

function setState(patch) {
  return ext.storage.local.set(patch);
}

/* One signal per event: the page toast and the OS notification must never fire
 * for the same detection. Page flows toast in-page; background notifies the OS
 * only when the page cannot (failures) or when no toast exists (manual saves).
 * The toolbar badge is silent and always safe to tick. */
function setBadgeTick(text, color) {
  try {
    ext.action.setBadgeText({ text: text || "✓" });
    ext.action.setBadgeBackgroundColor({ color: color || "#16a34a" });
    setTimeout(function () {
      ext.action.setBadgeText({ text: "" });
    }, 5000);
  } catch (e) {
    /* ignore */
  }
}

function notify(title, message) {
  try {
    if (ext.notifications) {
      ext.notifications.create({
        type: "basic",
        iconUrl: ext.runtime.getURL("icons/icon128.png"),
        title: title,
        message: message,
      });
    }
  } catch (e) {
    /* notifications optional */
  }
  setBadgeTick("✓", "#16a34a");
}

/**
 * Backend resolution — no input required. A stored custom URL always wins
 * (including legacy values from older installs); otherwise localhost:3000 is
 * probed and used when something answers there (any HTTP status counts).
 */
var LOCAL_BACKEND = "http://localhost:3000";

async function resolveBackend() {
  var state = await getState();
  var settings = state.settings || {};
  var override = (settings.backendUrlOverride || "").replace(/\/+$/, "");
  if (!override && settings.backendUrl) {
    var legacy = String(settings.backendUrl).replace(/\/+$/, "");
    if (legacy && legacy !== LOCAL_BACKEND) override = legacy;
  }
  if (override) return { url: override, mode: "custom" };
  try {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2500);
    await fetch(LOCAL_BACKEND + "/api/notion/status", { signal: ctrl.signal });
    clearTimeout(timer);
    return { url: LOCAL_BACKEND, mode: "auto" };
  } catch (e) {
    return { url: LOCAL_BACKEND, mode: "auto-offline" };
  }
}

/**
 * The dashboard login session, borrowed via the cookies permission.
 * Reads the app's httpOnly login cookie — the raw token is never typed,
 * pasted, or stored by the extension. Falls back to a legacy pasted token
 * from older installs (removed from the UI, kept working so nothing breaks).
 */
async function sessionToken() {
  var resolved = await resolveBackend();
  var base = resolved.url;
  try {
    var cookie = await ext.cookies.get({ url: base + "/", name: "nt_token" });
    if (cookie && cookie.value)
      return { token: cookie.value, backendUrl: base, mode: resolved.mode };
  } catch (e) {
    /* cookies permission missing or backend unreachable */
  }
  var state = await getState();
  if (state.settings.notionToken) {
    return { token: state.settings.notionToken, backendUrl: base, mode: resolved.mode, legacy: true };
  }
  return { token: null, backendUrl: base, mode: resolved.mode };
}

async function saveApplication(job, confidence, silentSuccess) {
  var state = await getState();
  var key = dedupeKey(job);
  if (state.appliedKeys.includes(key)) {
    await setState({ lastStatus: "duplicate — already saved" });
    return { ok: true, deduped: true, local: true };
  }

  var record = {
    company: job.company || "Unknown",
    title: job.title || "Unknown role",
    location: job.location || "",
    description: String(job.description || "").slice(0, 4000),
    jobUrl: job.jobUrl || "",
    applicationUrl: job.applicationUrl || job.jobUrl || "",
    source: job.source || "",
    status: "Applied",
    appliedDate: new Date().toISOString(),
    confidence: confidence || "high",
    savedAt: new Date().toISOString(),
    pageId: null,
    deduped: false,
  };

  // Always keep a local copy first (works even when Notion is unconfigured).
  var applications = [record].concat(state.applications).slice(0, 200);
  var appliedKeys = [key].concat(state.appliedKeys).slice(0, 500);
  await setState({
    applications: applications,
    appliedKeys: appliedKeys,
    lastStatus: "saved locally",
  });

  // Forward to Notion via the dashboard login session.
  try {
    var session = await sessionToken();
    var backendUrl = session.backendUrl;
    if (!session.token) {
      await setState({ lastStatus: "not signed in — sign in on the dashboard first" });
      notify(
        "Saved locally — Notion needs login",
        "Sign in on the dashboard, then re-open the popup. No token pasting needed."
      );
      return { ok: false, error: "Not signed in on the dashboard.", local: true };
    }
    var res = await fetch(backendUrl + "/api/notion/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: record.company,
        title: record.title,
        location: record.location,
        description: record.description,
        jobUrl: record.jobUrl,
        applicationUrl: record.applicationUrl,
        source: record.source,
        status: record.status,
        appliedDate: record.appliedDate,
        notes: "",
        token: session.token,
        databaseId: state.settings.databaseId || state.settings.notionDatabaseId || undefined,
      }),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (data && data.ok) {
      record.pageId = data.pageId || null;
      record.deduped = !!data.deduped;
      var apps = (await getState()).applications;
      if (apps[0]) {
        apps[0] = record;
        await setState({ applications: apps });
      }
      await setState({
        lastStatus: data.deduped ? "duplicate in Notion" : "saved to Notion",
      });
      // The auto-detect path already toasted in-page: stay silent on success,
      // tick the badge only. Manual/pending saves have no toast, so notify.
      setBadgeTick("✓", "#16a34a");
      if (!silentSuccess) {
        notify(
          data.deduped ? "Duplicate — already in Notion" : "✓ Application detected",
          record.company + " · " + record.title
        );
      }
      return { ok: true, deduped: !!data.deduped, pageId: data.pageId || null };
    }
    await setState({
      lastStatus: "Notion error: " + (data.error || res.status),
    });
    notify(
      "Saved locally — Notion sync failed",
      String(data.error || "HTTP " + res.status).slice(0, 200),
    );
    return {
      ok: false,
      error: data.error || "HTTP " + res.status,
      local: true,
    };
  } catch (e) {
    await setState({ lastStatus: "backend unreachable — saved locally" });
    notify(
      "Saved locally — backend unreachable",
      String((e && e.message) || e).slice(0, 200),
    );
    return { ok: false, error: String((e && e.message) || e), local: true };
  }
}

ext.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  (async function () {
    if (!msg || !msg.type) return;
    if (msg.type === "JOB_DETECTED") {
      await setState({ currentJob: msg.job });
    } else if (msg.type === "APPLY_CLICKED") {
      await setState({
        currentJob: msg.job,
        lastStatus: "tracking application…",
      });
    } else if (msg.type === "APPLICATION_SUBMITTED") {
      if (msg.confidence === "high") {
        // In-page toast already shown: silent success, OS noise only on failure.
        await saveApplication(msg.job, "high", true);
      } else {
        await setState({
          pending: { job: msg.job, matched: msg.matched || "", at: Date.now() },
          lastStatus: "possible application — confirm in popup",
        });
        // In-page toast carries the Save/Ignore actions: badge only, no second popup.
        setBadgeTick("?", "#e7c066");
      }
    } else if (msg.type === "SAVE_PENDING") {
      var s1 = await getState();
      if (s1.pending) {
        await setState({ pending: null });
        await saveApplication(s1.pending.job, "low", false);
      }
      sendResponse({ ok: true });
    } else if (msg.type === "IGNORE_PENDING") {
      await setState({ pending: null, lastStatus: "ignored" });
      sendResponse({ ok: true });
    } else if (msg.type === "SAVE_MANUAL") {
      sendResponse(await saveApplication(msg.job, "high", false));
    } else if (msg.type === "GET_STATE") {
      sendResponse(await getState());
    } else if (msg.type === "GET_SESSION") {
      // Lets the popup borrow the dashboard login: never exposes the cookie
      // store, just hands over the current token for direct backend calls.
      var sess = await sessionToken();
      var st = await getState();
      sendResponse({
        ok: true,
        signedIn: !!sess.token,
        token: sess.token,
        backendUrl: sess.backendUrl,
        backendMode: sess.mode,
        databaseId: st.settings.databaseId || st.settings.notionDatabaseId || "",
      });
    } else if (msg.type === "SAVE_SETTINGS") {
      var prev = (await getState()).settings || {};
      var incoming = msg.settings || {};
      var nextSettings = {
        databaseId: ("databaseId" in incoming ? incoming.databaseId : prev.databaseId || prev.notionDatabaseId || "") || "",
        backendUrlOverride: ("backendUrlOverride" in incoming ? incoming.backendUrlOverride : prev.backendUrlOverride || "") || "",
      };
      // Preserve legacy fields untouched so older installs keep working.
      if (prev.backendUrl) nextSettings.backendUrl = prev.backendUrl;
      if (prev.notionToken) nextSettings.notionToken = prev.notionToken;
      if (prev.notionDatabaseId) nextSettings.notionDatabaseId = prev.notionDatabaseId;
      await setState({ settings: nextSettings });
      sendResponse({ ok: true });
    }
  })();
  // Keep channel open for async sendResponse.
  if (
    msg &&
    (msg.type === "SAVE_PENDING" ||
      msg.type === "IGNORE_PENDING" ||
      msg.type === "SAVE_MANUAL" ||
      msg.type === "GET_STATE" ||
      msg.type === "GET_SESSION" ||
      msg.type === "SAVE_SETTINGS")
  )
    return true;
  return false;
});

ext.runtime.onInstalled.addListener(function () {
  ext.storage.local.get(DEFAULT_STATE).then(function (s) {
    if (!s.settings)
      ext.storage.local.set({ settings: DEFAULT_STATE.settings });
  });
});
