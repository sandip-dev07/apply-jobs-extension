/* Popup logic for Job Application Tracker.
 * Auth model: the extension borrows the dashboard's Notion login via the
 * cookies permission. No token is ever typed, pasted, or stored here.
 * Backend model: auto-detected (localhost probe) unless overridden.
 */
"use strict";

// Cross-browser API: Firefox exposes promise-based `browser.*`, Chrome exposes `chrome.*`.
var ext = (typeof browser !== "undefined" && browser && browser.runtime) ? browser : chrome;

function $(id) { return document.getElementById(id); }

function bg(msg) {
  // Promise style first (Chrome MV3 + Firefox): rejections are caught, so no
  // unchecked runtime.lastError. Falls back to callback style on older Chrome.
  try {
    var p = ext.runtime.sendMessage(msg);
    if (p && typeof p.then === "function") {
      return p.catch(function () { return null; }).then(function (r) { return r || null; });
    }
  } catch (e) { /* fall through to callback style */ }
  return new Promise(function (resolve) {
    try {
      ext.runtime.sendMessage(msg, function (resp) {
        if (ext.runtime && ext.runtime.lastError) resolve(null);
        else resolve(resp || null);
      });
    } catch (err) {
      resolve(null);
    }
  });
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

/* Raw background statuses → one calm line. */
function friendlyStatus(s) {
  if (!s || s === "idle") return "Idle — apply somewhere and I'll notice.";
  if (s.indexOf("tracking application") !== -1) return "Watching this application…";
  if (s.indexOf("not signed in") !== -1) return "Not signed in — use the card above.";
  if (s.indexOf("saved to Notion") !== -1) return "Saved to Notion ✓";
  if (s.indexOf("duplicate") !== -1) return "Already saved — skipped duplicate.";
  if (s.indexOf("possible application") !== -1) return "Needs your call — see above.";
  if (s === "ignored") return "Ignored.";
  if (s === "saved locally") return "Saved on this device.";
  return s.length > 90 ? s.slice(0, 90) + "…" : s;
}

async function currentTabJob() {
  try {
    var tabs = await ext.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].id) return null;
    // Promise style: on chrome:// pages, new-tab, or un-injected tabs there is
    // no receiving end — the rejection is caught and treated as "no job here".
    var resp = await ext.tabs
      .sendMessage(tabs[0].id, { type: "GET_JOB" })
      .catch(function () { return null; });
    return resp || null;
  } catch (e) { return null; }
}

async function render() {
  var state = await bg({ type: "GET_STATE" });
  if (!state) { $("status").textContent = "Could not reach background worker."; return; }
  $("status").textContent = friendlyStatus(state.lastStatus);

  var apps = state.applications || [];
  var startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  var today = apps.filter(function (a) { return new Date(a.savedAt || a.appliedDate) >= startOfDay; }).length;
  $("today").textContent = String(today);
  $("total").textContent = String(apps.length);
  $("recent").innerHTML = apps.slice(0, 5).map(function (a) {
    return "<div class='item'><div><b>" + esc(a.company) + "</b><br><span class='muted'>" + esc(a.title) + " · " + esc(a.status || "Applied") + "</span></div></div>";
  }).join("") || "<div class='muted'>No applications yet.</div>";

  if (state.pending && state.pending.job) {
    $("pending").classList.remove("hidden");
    $("pendingJob").textContent = (state.pending.job.company || "") + " · " + (state.pending.job.title || "");
  } else {
    $("pending").classList.add("hidden");
  }

  var tabJob = await currentTabJob();
  var job = (tabJob && tabJob.job) || state.currentJob;
  // Only show the card when there's something worth saving — never "Unknown" junk.
  if (job && job.title && job.company) {
    $("jobCard").classList.remove("hidden");
    $("current").innerHTML = "<b>" + esc(job.company) + "</b><br>" + esc(job.title) +
      (job.location ? "<br><span class='muted'>" + esc(job.location) + "</span>" : "") +
      (job.source ? "<br><span class='muted'>" + esc(job.source) + "</span>" : "");
    $("current").dataset.job = JSON.stringify(job);
  } else {
    $("jobCard").classList.add("hidden");
    $("current").dataset.job = "";
  }

  await renderSession(state);
}

/* Session area: signed-in → database picker; signed-out → top card handles it. */
async function renderSession(state) {
  var area = $("sessionArea");
  var sess = await bg({ type: "GET_SESSION" });
  var base = (sess && sess.backendUrl) || "http://localhost:3000";
  var modeNote = sess && sess.backendMode === "custom" ? "custom" : "auto";
  $("backendLine").textContent = "Backend: " + base + " (" + modeNote + ")";
  var signedIn = !!(sess && sess.signedIn);
  $("signinCard").classList.toggle("hidden", signedIn);
  if (!signedIn) {
    area.innerHTML = "<div class='muted'>Sign in above to choose a database.</div>";
    return;
  }
  var dbs = [];
  try {
    var res = await fetch(base + "/api/notion/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: sess.token }),
    });
    var data = await res.json();
    dbs = (data && data.databases) || [];
  } catch (e) { /* backend unreachable — picker stays empty */ }
  var current = (state.settings && state.settings.databaseId) || "";
  area.innerHTML =
    "<div class='muted'>Signed in — filing into:</div>" +
    "<select id='sDbSelect'>" +
    "<option value=''>Dashboard default database</option>" +
    dbs.map(function (d) {
      return "<option value='" + esc(d.id) + "'" + (d.id === current ? " selected" : "") + ">" + esc(d.title) + "</option>";
    }).join("") +
    "</select>";
  $("sDbSelect").addEventListener("change", async function () {
    await bg({ type: "SAVE_SETTINGS", settings: { databaseId: $("sDbSelect").value } });
    say("Database preference saved.");
    render();
  });
}

function say(msg) { $("msg").textContent = msg; }

document.addEventListener("DOMContentLoaded", function () {
  render();

  $("btnSignIn").addEventListener("click", async function () {
    var sess = await bg({ type: "GET_SESSION" });
    var base = (sess && sess.backendUrl) || "http://localhost:3000";
    ext.tabs.create({ url: base + "/settings" });
  });
  $("btnSavePending").addEventListener("click", async function () {
    var r = await bg({ type: "SAVE_PENDING" });
    say(r && r.error ? r.error : "Saved.");
    render();
  });
  $("btnIgnorePending").addEventListener("click", async function () {
    await bg({ type: "IGNORE_PENDING" });
    say("Ignored.");
    render();
  });
  $("btnSaveCurrent").addEventListener("click", async function () {
    var raw = $("current").dataset.job;
    if (!raw) { say("No job detected to save."); return; }
    var r = await bg({ type: "SAVE_MANUAL", job: JSON.parse(raw) });
    say(r && r.error ? r.error : (r && r.deduped ? "Duplicate — already saved." : "Saved."));
    render();
  });
  $("btnManual").addEventListener("click", async function () {
    var tabs = await ext.tabs.query({ active: true, currentWindow: true });
    var url = ($("fUrl").value || "").trim() || (tabs[0] && tabs[0].url) || "";
    if (!$("fCompany").value.trim() || !$("fTitle").value.trim() || !url) { say("Company, title and URL are required."); return; }
    var r = await bg({ type: "SAVE_MANUAL", job: {
      company: $("fCompany").value.trim(), title: $("fTitle").value.trim(),
      jobUrl: url, applicationUrl: url, location: $("fLocation").value.trim(), source: "Manual",
    }});
    say(r && r.error ? r.error : (r && r.deduped ? "Duplicate — already saved." : "Saved."));
    render();
  });
  $("btnBackendSave").addEventListener("click", async function () {
    var v = ($("sBackendCustom").value || "").trim().replace(/\/+$/, "");
    if (!v) { say("Paste a backend URL first, or use Auto-detect."); return; }
    await bg({ type: "SAVE_SETTINGS", settings: { backendUrlOverride: v } });
    say("Custom backend saved.");
    render();
  });
  $("btnBackendAuto").addEventListener("click", async function () {
    await bg({ type: "SAVE_SETTINGS", settings: { backendUrlOverride: "" } });
    say("Back to auto-detect.");
    render();
  });
  $("btnOpenNotion").addEventListener("click", function () {
    ext.tabs.create({ url: "https://www.notion.so/" });
  });
  $("btnTest").addEventListener("click", async function () {
    var sess = await bg({ type: "GET_SESSION" });
    var base = (sess && sess.backendUrl) || "http://localhost:3000";
    if (!sess || !sess.signedIn) {
      say("Not signed in — use the card at the top first.");
      return;
    }
    say("Testing…");
    try {
      var qs = new URLSearchParams();
      qs.set("token", sess.token);
      var st = await bg({ type: "GET_STATE" });
      var db = (st && st.settings && st.settings.databaseId) || "";
      if (db) qs.set("databaseId", db);
      var res = await fetch(base + "/api/notion/status?" + qs.toString());
      var data = await res.json();
      if (data.configured && data.reachable) {
        say("Connected to “" + (data.databaseTitle || "database") + "” ✓");
      } else if (!data.configured) {
        say("Backend OK, but no database selected.");
      } else {
        say((data.hint ? data.hint : (data.error || "Connection failed.")));
      }
    } catch (e) {
      say("Backend unreachable — is the app running at " + base + "?");
    }
  });
});
