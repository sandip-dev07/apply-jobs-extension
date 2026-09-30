/* Job Application Tracker — content script (no bundler, vanilla JS).
 * Flow: extract job -> watch Apply click -> MutationObserver + SPA nav -> success phrases -> notify background.
 * Privacy: only job metadata (company, title, location, description, URLs, source) is ever sent. Never form contents.
 */
(function () {
  "use strict";

  var APPLY_PATTERNS = [
    "apply", "apply now", "easy apply", "apply for this job",
    "submit application", "apply for job", "quick apply",
    "1-click apply", "one-click apply",
  ];
  var SUCCESS_PATTERNS = [
    "application submitted", "application received", "thank you for applying",
    "thanks for applying", "successfully applied", "we've received your application",
    "we have received your application", "your application has been submitted",
    "your application was submitted", "application complete",
    "you have applied", "you've applied", "applied successfully",
  ];
  // Generic submission signals. These NEVER auto-save — they only raise a
  // low-confidence "Possible application detected" prompt for the user to confirm.
  // (Covers plain forms like "Thank you for your submission" / "Response recorded".)
  var GENERIC_PATTERNS = [
    "thank you", "thanks", "successfully submitted", "has been submitted",
    "submission received", "submission successful", "form submitted",
    "response recorded", "response received", "we've received your",
    "we have received your", "we'll be in touch", "we will be in touch",
  ];
  var BANNER_SELECTOR = "h1,h2,h3,[role='dialog'],[role='alert'],[role='status'],[class*='modal'],[class*='success'],[class*='confirm'],[class*='thank']";
  var SOURCE_MAP = {
    "linkedin.com": "LinkedIn", "greenhouse.io": "Greenhouse", "lever.co": "Lever",
    "myworkdayjobs.com": "Workday", "ashbyhq.com": "Ashby", "jobs.ashbyhq.com": "Ashby",
    "indeed.com": "Indeed", "glassdoor.com": "Glassdoor", "wellfound.com": "Wellfound",
    "naukri.com": "Naukri", "foundit.in": "Foundit", "cutshort.io": "Cutshort",
  };

  var tracking = false;
  var trackingSince = 0;
  var currentJob = null;
  var savedForUrl = "";
  var TRACK_TIMEOUT_MS = 20 * 60 * 1000;

  console.log("[job-tracker] content script loaded on", location.href);

  function normText(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function detectSource() {
    var host = location.hostname.toLowerCase();
    for (var d in SOURCE_MAP) if (host.indexOf(d) !== -1) return SOURCE_MAP[d];
    return location.hostname.replace(/^www\./, "");
  }

  function stripHtml(html) {
    try {
      var div = document.createElement("div");
      div.innerHTML = String(html || "").slice(0, 50000);
      return normText(div.textContent || div.innerText || "");
    } catch (e) { return ""; }
  }

  function extractJsonLd() {
    try {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        var raw = scripts[i].textContent || "";
        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { continue; }
        var items = Array.isArray(parsed) ? parsed : [parsed];
        // handle @graph
        if (parsed && parsed["@graph"]) items = parsed["@graph"];
        for (var j = 0; j < items.length; j++) {
          var it = items[j];
          if (!it) continue;
          var t = it["@type"];
          var isJob = t === "JobPosting" || (Array.isArray(t) && t.indexOf("JobPosting") !== -1);
          if (!isJob) continue;
          var org = it.hiringOrganization;
          var company = typeof org === "string" ? org : (org && (org.name || "")) || "";
          var loc = it.jobLocation;
          if (Array.isArray(loc)) loc = loc[0];
          var location = "";
          if (typeof loc === "string") location = loc;
          else if (loc && loc.address) {
            var a = loc.address;
            location = [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(", ");
          }
          return {
            company: normText(company),
            title: normText(it.title || ""),
            location: normText(location),
            description: stripHtml(it.description || "").slice(0, 4000),
            fromJsonLd: true,
          };
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function metaContent(sel, attr) {
    var el = document.querySelector(sel);
    return el ? normText(el.getAttribute(attr || "content") || "") : "";
  }

  function extractFromDom() {
    var title =
      metaContent('meta[property="og:title"]') ||
      normText(document.querySelector("h1") ? document.querySelector("h1").textContent : "") ||
      normText(document.title.split("|")[0].split("—")[0].split("-")[0]);
    // Company: common selectors
    var company = "";
    var selectors = [
      '[data-testid="company-name"]', ".company-name", ".employer-name",
      'a[data-tracking="company"]', '[class*="company"]',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && normText(el.textContent).length < 80 && normText(el.textContent)) {
        company = normText(el.textContent);
        break;
      }
    }
    if (!company) {
      // fallback: "Company is hiring" patterns in og:site_name
      company = metaContent('meta[property="og:site_name"]') || "";
    }
    var location = "";
    var locEl = document.querySelector('[data-testid="job-location"], .job-location, [class*="location"]');
    if (locEl) location = normText(locEl.textContent).slice(0, 120);
    return { company: company, title: title.slice(0, 200), location: location, fromJsonLd: false };
  }

  function extractDescriptionFromDom() {
    var selectors = [
      '[data-testid="job-description"]',
      ".job-description",
      '[class*="job-description"]',
      '[id*="job-desc"]',
      ".jobDescription",
      "article",
    ];
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        var t = normText(nodes[j].innerText || nodes[j].textContent || "");
        // Only accept substantial blocks to avoid nav/footer junk.
        if (t.length > 200) return t.slice(0, 4000);
      }
    }
    // Last resort: meta description (often a JD summary), capped short.
    var md = metaContent('meta[name="description"]') || metaContent('meta[property="og:description"]');
    return md.slice(0, 1000);
  }

  function extractJob() {
    var jl = extractJsonLd();
    var dom = extractFromDom();
    var job = {
      company: (jl && jl.company) || dom.company || "",
      title: (jl && jl.title) || dom.title || "",
      location: (jl && jl.location) || dom.location || "",
      description: ((jl && jl.description) || extractDescriptionFromDom() || "").slice(0, 4000),
      jobUrl: location.href.split("#")[0],
      applicationUrl: location.href.split("#")[0],
      source: detectSource(),
    };
    return job;
  }

  function isApplyText(t) {
    var s = normText(t).toLowerCase();
    if (!s || s.length > 40) return false;
    for (var i = 0; i < APPLY_PATTERNS.length; i++) {
      if (s === APPLY_PATTERNS[i] || s.indexOf(APPLY_PATTERNS[i]) !== -1) {
        // avoid "applicant login" style false positives
        if (s.indexOf("applicant") !== -1 && s.indexOf("apply") === -1) continue;
        return true;
      }
    }
    return false;
  }

  function checkSuccessInText(text) {
    var s = (text || "").toLowerCase();
    var hits = [];
    for (var i = 0; i < SUCCESS_PATTERNS.length; i++) {
      if (s.indexOf(SUCCESS_PATTERNS[i]) !== -1) hits.push(SUCCESS_PATTERNS[i]);
    }
    return hits;
  }

  // Generic signals only count inside short banner-like nodes (headings, dialogs,
  // success banners) — never in footers or body copy. Returns the matched phrase or "".
  function checkGenericBanner() {
    var nodes;
    try {
      nodes = document.querySelectorAll(BANNER_SELECTOR);
    } catch (e) { return ""; }
    for (var i = 0; i < Math.min(nodes.length, 60); i++) {
      var nt = normText(nodes[i].innerText || nodes[i].textContent || "");
      if (nt.length < 3 || nt.length > 300) continue;
      var s = nt.toLowerCase();
      for (var j = 0; j < GENERIC_PATTERNS.length; j++) {
        if (s.indexOf(GENERIC_PATTERNS[j]) !== -1) return GENERIC_PATTERNS[j];
      }
    }
    return "";
  }

  function visibleText() {
    // Cheap: body innerText capped — only used locally for phrase matching, never sent to server.
    try {
      return (document.body ? document.body.innerText : "").slice(0, 20000);
    } catch (e) { return ""; }
  }

  function send(msg) {
    try { chrome.runtime.sendMessage(msg); } catch (e) { /* background may be asleep */ }
  }

  function refreshJob(reason) {
    var job = extractJob();
    // Only report when we have at least a title.
    if (job.title) {
      currentJob = job;
      send({ type: "JOB_DETECTED", job: job, reason: reason || "load" });
    }
  }

  function showToast(html, withActions) {
    try {
      var old = document.getElementById("job-tracker-toast");
      if (old) old.remove();
      var div = document.createElement("div");
      div.id = "job-tracker-toast";
      div.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483647;max-width:340px;background:#111;color:#fff;border-radius:12px;padding:14px 16px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3)";
      div.innerHTML = html;
      document.documentElement.appendChild(div);
      if (withActions) {
        var saveBtn = div.querySelector("[data-act='save']");
        var ignBtn = div.querySelector("[data-act='ignore']");
        if (saveBtn) saveBtn.addEventListener("click", function () {
          send({ type: "SAVE_PENDING" });
          div.remove();
        });
        if (ignBtn) ignBtn.addEventListener("click", function () {
          send({ type: "IGNORE_PENDING" });
          div.remove();
        });
        setTimeout(function () { if (div.parentNode) div.remove(); }, 30000);
      } else {
        setTimeout(function () { if (div.parentNode) div.remove(); }, 8000);
      }
    } catch (e) { /* ignore */ }
  }

  function onSuccess(high, matchedPhrase) {
    if (!currentJob) currentJob = extractJob();
    currentJob.applicationUrl = location.href.split("#")[0];
    tracking = false;
    if (savedForUrl === currentJob.jobUrl + "|" + matchedPhrase) return; // avoid double-fire
    savedForUrl = currentJob.jobUrl + "|" + matchedPhrase;
    if (high) {
      showToast("<b>✓ Application detected</b><br>" +
        escapeHtml(currentJob.company || "Unknown") + " · " + escapeHtml(currentJob.title || "Unknown role") +
        "<br><span style='opacity:.7'>Saving to Notion…</span>", false);
      send({ type: "APPLICATION_SUBMITTED", job: currentJob, confidence: "high", matched: matchedPhrase });
    } else {
      showToast("<b>Possible application detected</b><br>" +
        escapeHtml(currentJob.company || "Unknown") + " · " + escapeHtml(currentJob.title || "Unknown role") +
        "<br><span style='opacity:.7'>Was this an application?</span><br><br>" +
        "<button data-act='save' style='background:#fff;color:#111;border:0;border-radius:8px;padding:6px 12px;margin-right:8px;cursor:pointer'>Save</button>" +
        "<button data-act='ignore' style='background:transparent;color:#fff;border:1px solid #555;border-radius:8px;padding:6px 12px;cursor:pointer'>Ignore</button>", true);
      send({ type: "APPLICATION_SUBMITTED", job: currentJob, confidence: "low", matched: matchedPhrase });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 1. Apply click detection (capture phase so SPA handlers don't hide it).
  document.addEventListener("click", function (e) {
    var t = e.target;
    var el = t && t.closest ? t.closest("button, a, input[type='submit'], [role='button']") : null;
    var text = el ? (el.innerText || el.value || el.getAttribute("aria-label") || "") : "";
    if (el && isApplyText(text)) {
      currentJob = extractJob();
      tracking = true;
      trackingSince = Date.now();
      send({ type: "APPLY_CLICKED", job: currentJob, buttonText: normText(text) });
    } else if (el && (el.type === "submit" || isSubmitText(text))) {
      // Submit-like click: covers JS/fetch forms that never fire a native
      // submit event (form builders, React-controlled forms). Arming alone
      // saves nothing — confirmation text still decides.
      var job = currentJob || extractJob();
      if (job.title) {
        currentJob = job;
        tracking = true;
        trackingSince = Date.now();
        send({ type: "APPLY_CLICKED", job: currentJob, buttonText: "submit-click:" + normText(text).slice(0, 40) });
      }
    }
  }, true);

  // Submit-family button labels ("Submit", "Send", "Finish", …). Kept separate
  // from Apply patterns so plain submits arm tracking without implying an apply.
  function isSubmitText(t) {
    var s = normText(t).toLowerCase();
    if (!s || s.length > 30) return false;
    return s === "submit" || s === "send" || s === "finish" || s === "complete" || s === "done" ||
      s.indexOf("submit") !== -1;
  }

  // Enter-key submits (inputs that POST on Enter with no button click at all).
  document.addEventListener("keydown", function (e) {
    if (tracking || !e || e.key !== "Enter") return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      var jobKb = currentJob || extractJob();
      if (jobKb.title) {
        currentJob = jobKb;
        tracking = true;
        trackingSince = Date.now();
        send({ type: "APPLY_CLICKED", job: currentJob, buttonText: "enter-submit" });
      }
    }
  }, true);

  // 2. Form submit detection: arm tracking on any submit where a job title was
  // extracted (covers direct form links with no Apply step). What happens next
  // still depends on confirmation text — arming alone saves nothing.
  document.addEventListener("submit", function () {
    if (!tracking) {
      var job = currentJob || extractJob();
      if (job.title) {
        currentJob = job;
        tracking = true;
        trackingSince = Date.now();
        send({ type: "APPLY_CLICKED", job: currentJob, buttonText: "form-submit" });
      }
    }
  }, true);

  // 3. MutationObserver: watch for confirmation banners/modals after tracking started.
  var observer = new MutationObserver(function (mutations) {
    if (!tracking) return;
    if (Date.now() - trackingSince > TRACK_TIMEOUT_MS) { tracking = false; return; }
    var text = visibleText();
    var hits = checkSuccessInText(text);
    if (hits.length > 0) {
      // High confidence when the matched text appears in a heading/dialog/alert-like node.
      var strong = false;
      try {
        var nodes = document.querySelectorAll(BANNER_SELECTOR);
        for (var i = 0; i < Math.min(nodes.length, 40); i++) {
          var nt = (nodes[i].innerText || "").toLowerCase();
          if (checkSuccessInText(nt).length > 0) { strong = true; break; }
        }
      } catch (e) { /* ignore */ }
      onSuccess(strong, hits[0]);
      return;
    }
    // Generic submission signals ("Thank you", "Response recorded", …) only ever
    // raise a low-confidence prompt — the user confirms, nothing auto-saves.
    // Priority goes to freshly added/changed nodes: a confirmation that appears
    // right after submit, in ANY tag. Footer copy already in the DOM is ignored.
    var fresh = "";
    try {
      for (var m = 0; m < (mutations || []).length; m++) {
        var mu = mutations[m];
        if (mu.type === "characterData" && mu.target) {
          fresh += " " + normText(mu.target.textContent || "").slice(0, 500);
        } else if (mu.addedNodes) {
          for (var n = 0; n < mu.addedNodes.length; n++) {
            var node = mu.addedNodes[n];
            if (!node || node.nodeType !== 1) continue;
            var tag = (node.tagName || "").toLowerCase();
            if (tag === "script" || tag === "style" || tag === "noscript") continue;
            fresh += " " + normText(node.innerText || node.textContent || "").slice(0, 1000);
          }
        }
      }
    } catch (e) { /* ignore */ }
    var fl = fresh.toLowerCase();
    for (var j = 0; j < GENERIC_PATTERNS.length; j++) {
      if (fl.indexOf(GENERIC_PATTERNS[j]) !== -1) { onSuccess(false, GENERIC_PATTERNS[j]); return; }
    }
    // Fallback for confirmations rendered without fresh mutations.
    var generic = checkGenericBanner();
    if (generic) onSuccess(false, generic);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  // 4. SPA navigation: re-extract job + check success on URL change.
  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      refreshJob("navigation");
      if (tracking) {
        var hits = checkSuccessInText(visibleText() + " " + location.href);
        if (hits.length > 0) onSuccess(true, hits[0]);
        else {
          var g2 = checkGenericBanner();
          if (g2) onSuccess(false, g2);
          else if (/applied|confirmation|success|thank-you/i.test(location.href)) {
            // URL-based hint = low confidence
            onSuccess(false, "url:" + location.href);
          }
        }
      }
    }
  }, 1000);

  // Initial extraction.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { refreshJob("load"); });
  } else {
    refreshJob("load");
  }
  // Re-run after hydration for SPAs.
  setTimeout(function () { refreshJob("delayed"); }, 3000);

  // Allow popup to ask for current job.
  chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
    if (msg && msg.type === "GET_JOB") {
      var job = currentJob || extractJob();
      reply({ job: job, tracking: tracking });
    }
    return false;
  });
})();
