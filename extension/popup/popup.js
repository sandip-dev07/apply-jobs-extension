/* Popup logic for Docket.
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

// Must match WORKER_VERSION in background.js. A mismatch means the popup is
// fresh but the worker predates a reload — the actionable fix is reloading
// the extension, not retrying the click.
var EXPECTED_WORKER = 3;

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

/* Header pill: one short phrase for the current sync state.
 * Returns true when a pill is shown (the longer #status line is then hidden,
 * mirroring the landing-page popup mock: pill for state, no duplicate line). */
function pillFor(s) {
  if (!s || s === "idle") return null;
  if (s.indexOf("saved to Notion") !== -1) return { text: "saved to Notion", cls: "ok" };
  if (s.indexOf("duplicate") !== -1) return { text: "already saved", cls: "ok" };
  if (s.indexOf("saved locally") !== -1) return { text: "saved locally", cls: "warn" };
  if (s.indexOf("not signed in") !== -1) return { text: "not signed in", cls: "warn" };
  if (s.indexOf("possible application") !== -1) return { text: "needs a call", cls: "warn" };
  if (s.indexOf("tracking") !== -1) return { text: "tracking…", cls: "idle" };
  if (s.indexOf("error") !== -1) return { text: "sync failed", cls: "err" };
  return null;
}

function setPill(status, signedIn, backendUrl) {
  var pill = $("pill");
  if (!pill) return false;
  var spec = pillFor(status);
  // Transient sync states take the slot; otherwise it holds the persistent
  // Notion connection indicator so the header is never blank. The backend
  // URL rides along as a hover tooltip (used to be its own card).
  var isTransient = !!spec;
  if (!spec) {
    spec = signedIn
      ? { text: "Notion: connected", cls: "ok" }
      : { text: "Notion: not connected", cls: "warn" };
  }
  pill.textContent = spec.text;
  pill.title = isTransient ? status : spec.text + (backendUrl ? " · " + backendUrl : "");
  pill.className = "pill " + spec.cls;
  // Only transient states show the status line — the connection pill
  // coexists with it, and the idle line adds nothing, so it stays hidden.
  return isTransient;
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
  var sess = await bg({ type: "GET_SESSION" });
  var transient = setPill(state.lastStatus, !!(sess && sess.signedIn), sess && sess.backendUrl);
  var statusEl = $("status");
  statusEl.textContent = friendlyStatus(state.lastStatus);
  var idle = !state.lastStatus || state.lastStatus === "idle";
  statusEl.classList.toggle("hidden", transient || idle);
  // Merged local + Notion list (falls back to local-only when signed out,
  // offline, or without a database) so the popup matches the dashboard.
  var combo = await bg({ type: "GET_COMBINED" });
  var combined = (combo && combo.applications) || state.applications || [];

  var apps = combined.filter(function (a) {
    // Never show "Unknown" junk rows: failed extractions save with a
    // placeholder company, and rendering them (e.g. hero copy scraped as a
    // job title) makes the whole list look broken.
    var c = String(a.company || "").trim().toLowerCase();
    return c && c !== "unknown" && c !== "unknown company";
  });
  var startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  var today = apps.filter(function (a) { return new Date(a.savedAt || a.appliedDate) >= startOfDay; }).length;
  $("today").textContent = String(today);
  $("total").textContent = String(apps.length);

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

  // Signed-out mode: only the sign-in card stays visible. Everything gated
  // behind a login (counts, pending, current job, manual form, settings)
  // carries .signedin-only and is hidden here — after the per-card logic
  // above, so nothing can re-show them below this point.
  var signedOut = !(sess && sess.signedIn);
  Array.prototype.forEach.call(
    document.querySelectorAll(".signedin-only"),
    function (el) { el.classList.toggle("hidden", signedOut); }
  );

  await renderSession(state, combo, sess);
}

/* Session area: signed-in → database picker; signed-out → top card handles it. */
async function renderSession(state, combo, sess) {
  var area = $("sessionArea");
  if (!sess) sess = await bg({ type: "GET_SESSION" });
  var base = (sess && sess.backendUrl) || "http://localhost:3000";
  var signedIn = !!(sess && sess.signedIn);
  if (sess && sess.workerVersion !== EXPECTED_WORKER) {
    // Fresh popup, pre-reload worker: protocol messages (GET_COMBINED,
    // TEST_CONNECTION) don't exist over there yet. Say so directly.
    say("Extension updated — reload it at chrome://extensions, then re-open this popup.");
  }
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
  // Name the dashboard's own pick when the extension defers to it, so the
  // default option isn't a mystery. Zero extra requests: dbs is already here.
  var dashDbId = (sess && sess.dashboardDbId) || "";
  var dashTitle = "";
  if (dashDbId) {
    var hit = dbs.filter(function (d) { return d.id === dashDbId; })[0];
    if (hit && hit.title) dashTitle = hit.title;
  }
  var defaultLabel = "Dashboard default" + (dashTitle ? ": " + dashTitle : " database");
  area.innerHTML =
    "<div class='fieldlabel'>Signed in — filing into:</div>" +
    "<select id='sDbSelect'>" +
    "<option value=''>" + esc(defaultLabel) + "</option>" +
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

/* Header menu: open dashboard / log out. Closes on selection, outside
 * click, or Escape. */
function closeMenu() {
  var menu = $("menu");
  var btn = $("btnMenu");
  if (menu) menu.classList.add("hidden");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

function wireMenu() {
  var btn = $("btnMenu");
  var menu = $("menu");
  if (!btn || !menu || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = menu.classList.toggle("hidden");
    btn.setAttribute("aria-expanded", open ? "false" : "true");
  });
  document.addEventListener("click", function (e) {
    if (menu.classList.contains("hidden")) return;
    if (menu.contains(e.target)) return;
    closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });
  $("menuDashboard").addEventListener("click", async function () {
    closeMenu();
    var sess = await bg({ type: "GET_SESSION" });
    var base = (sess && sess.backendUrl) || "http://localhost:3000";
    ext.tabs.create({ url: base + "/dashboard" });
  });
  $("menuLogout").addEventListener("click", async function () {
    closeMenu();
    say("Signing out…");
    await bg({ type: "LOGOUT" });
    say("Signed out.");
    render();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  wireMenu();
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
  $("btnOpenNotion").addEventListener("click", function () {
    ext.tabs.create({ url: "https://www.notion.so/" });
  });
  $("btnTest").addEventListener("click", async function () {
    say("Testing…");
    // Connectivity is checked through the background worker (same backend +
    // session the save flow uses), never by a second fetch path in the popup.
    var t = await bg({ type: "TEST_CONNECTION" });
    if (!t) {
      // Distinguish a stale worker (answers old messages, not new ones)
      // from a dead one so the message tells the truth.
      var probe = await bg({ type: "GET_STATE" });
      say(probe
        ? "Extension background is out of date — reload the extension at chrome://extensions, then retry."
        : "Could not reach background worker.");
      return;
    }
    if (t.ok) {
      say("Connected via " + t.backendUrl + " — " + t.databases + " database(s) shared ✓");
    } else if (t.error === "Not signed in — use the card at the top first.") {
      say(t.error);
    } else {
      say((t.error || "Connection failed.") + (t.hint ? " " + t.hint : ""));
    }
  });
});
