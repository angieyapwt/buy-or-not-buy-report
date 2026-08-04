const CONFIG = {
  // Replace this with your deployed Apps Script Web App URL.
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbyjaUJFlShe-bg4jm3uOm3b4e7UviLe1jBL1TTMVXP1VDlFhfqkPu0nPapdmYQNh4sC4A/exec",
  whatsappNumber: "6583963088",
  frontendVersion: "daily-count-request-state-2026-08-04-v49",
  defaultReportCount: 89,
  reportCountStartDate: "2026-08-04",
};

const CONTACT_WHATSAPP_URL = `https://wa.me/${CONFIG.whatsappNumber}`;

const demoCondos = [
  {
    developmentName: "The A",
    region: "CCR",
    district: "D10 - Tanglin, Bukit Timah, Holland Village",
    topYear: "2018",
    tenure: "99 years",
    totalUnits: "520",
    developer: "King",
    nearestMrt: "Pasir",
    primarySchool: "Pasir",
    malls: "Pasir",
    urbanTransformation: "Pasir",
    score: 78,
    verdict: "GO",
    summary:
      "This development shows stronger fundamentals across location, supply-demand, exit potential and development quality. Listing-level price and rental checks are still required before making an offer.",
    sectionScores: [
      ["Price", 33],
      ["Supply & Demand", 100],
      ["Exit Potential", 75],
      ["Rental", 50],
      ["Development", 100],
      ["Location", 100],
    ],
    strengths: [
      "Strong supply-demand and location indicators support its shortlist position.",
      "Exit potential appears healthier than the average preliminary profile.",
      "Development size and general profile are more defensible for future resale liquidity.",
    ],
    risks: [
      "Entry price needs live comparable transaction checks.",
      "Rental yield and rentability should be completed using the exact listing details.",
    ],
  },
  {
    developmentName: "Riverfront Residences",
    region: "OCR",
    district: "D19 - Hougang, Punggol, Sengkang",
    topYear: "2024",
    tenure: "99 years",
    totalUnits: "1472",
    developer: "Oxley-led consortium",
    nearestMrt: "Hougang / future CRL access",
    primarySchool: "Multiple schools nearby",
    malls: "Hougang Mall / Heartland Mall area",
    urbanTransformation: "North-East region growth",
    score: 69,
    verdict: "CONSIDER",
    summary:
      "This project has scale and family-buyer appeal, but live competition, rental depth and entry price must be checked carefully before proceeding.",
    sectionScores: [
      ["Price", 50],
      ["Supply & Demand", 75],
      ["Exit Potential", 62],
      ["Rental", 50],
      ["Development", 88],
      ["Location", 75],
    ],
    strengths: [
      "Large development size can support resale visibility and transaction activity.",
      "Family-oriented location profile may help own-stay demand.",
    ],
    risks: [
      "Large supply means unit selection and pricing discipline matter.",
      "Rental yield requires current rent evidence and listing-specific entry price.",
    ],
  },
];

const form = document.querySelector("#leadForm");
const statusEl = document.querySelector("#formStatus");
const resultSection = document.querySelector("#resultSection");
const reportMount = document.querySelector("#reportMount");
const suggestions = document.querySelector("#condoSuggestions");
const submitButton = form.querySelector('button[type="submit"]');
const reportCountEl = document.querySelector("#reportCount");
let displayedReportCount = 0;
let reportCountTimer = null;
let reportCountStarted = false;
let reportCountTarget = CONFIG.defaultReportCount;
let reportCountResolved = false;
let reportCountVisible = false;
let reportCountStatsPromise = null;
let isSubmitting = false;

function init() {
  suggestions.innerHTML = "";
  form.addEventListener("submit", handleSubmit);
  loadReportStats();
}

async function loadReportStats() {
  if (!reportCountEl) return;
  reportCountEl.textContent = "...";
  displayedReportCount = 0;
  reportCountStarted = false;
  reportCountResolved = true;
  reportCountVisible = false;
  reportCountTarget = calculatedDailyReportCount();
  reportCountStatsPromise = Promise.resolve(reportCountTarget);

  observeReportCount();
}

function resolveReportCountTarget() {
  reportCountResolved = true;
  reportCountTarget = calculatedDailyReportCount();
  return Promise.resolve(reportCountTarget);
}

function calculatedDailyReportCount() {
  const start = singaporeDateNumber(CONFIG.reportCountStartDate);
  const today = singaporeDateNumber(new Date());
  const days = Math.max(0, Math.floor((today - start) / 86400000));
  let total = CONFIG.defaultReportCount;
  for (let index = 1; index <= days; index += 1) {
    total += dailyReportIncrement(index);
  }
  return total;
}

function singaporeDateNumber(value) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00+08:00`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).split("-");
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function dailyReportIncrement(dayIndex) {
  const seed = dayIndex * 9301 + 49297;
  return (seed % 5) + 1;
}

function observeReportCount() {
  const target = reportCountEl.closest(".preview-count") || reportCountEl;
  if (!("IntersectionObserver" in window)) {
    startReportCountAnimation();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    startReportCountAnimation();
  }, {
    root: null,
    rootMargin: "0px 0px -8% 0px",
    threshold: 0.35,
  });

  observer.observe(target);
}

function startReportCountAnimation() {
  if (reportCountStarted) return;
  reportCountVisible = true;

  reportCountStarted = true;
  animateReportCount(reportCountResolved ? reportCountTarget : CONFIG.defaultReportCount);
  reportCountStatsPromise = reportCountStatsPromise || resolveReportCountTarget();
  reportCountStatsPromise.then((target) => {
    if (Number(target) > displayedReportCount) animateReportCount(target);
  });
}

function animateReportCount(target) {
  if (!reportCountEl) return;
  if (reportCountTimer) {
    clearInterval(reportCountTimer);
    reportCountTimer = null;
  }

  const finalValue = Math.max(CONFIG.defaultReportCount, Math.round(Number(target) || CONFIG.defaultReportCount));
  const startValue = displayedReportCount || 0;
  if (startValue === finalValue) {
    reportCountEl.textContent = finalValue.toLocaleString("en-SG");
    return;
  }

  const durationMs = 1800;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(startValue + (finalValue - startValue) * eased);
    displayedReportCount = value;
    reportCountEl.textContent = value.toLocaleString("en-SG");

    if (progress < 1) {
      return;
    }

    clearInterval(reportCountTimer);
    reportCountTimer = null;
    displayedReportCount = finalValue;
    reportCountEl.textContent = finalValue.toLocaleString("en-SG");
  }

  reportCountTimer = setInterval(() => tick(performance.now()), 16);
  tick(performance.now());
}

async function handleSubmit(event) {
  event.preventDefault();
  if (submitButton.disabled) return;
  setStatus("", "");

  const lead = collectLead();
  const validation = validateLead(lead);
  if (validation) {
    setStatus(validation, "error");
    return;
  }

  submitButton.disabled = true;
  isSubmitting = true;
  submitButton.textContent = "Sending report...";
  setStatus("Preparing your free report and sending it to your email...\nThis usually takes less than 20 seconds. Please do not refresh or go back.", "");
  const optimisticSentTimer = window.setTimeout(() => {
    if (!isSubmitting) return;
    renderRequestReceivedPending(lead);
    submitButton.textContent = "Request received";
    setStatus("Request received. Your report will be sent to your email shortly.", "success");
  }, 20000);

  try {
    const result = CONFIG.appsScriptUrl ? await submitToAppsScript(lead) : demoLookup(lead);
    if (result && result.ok === false) throw new Error(result.error || "Request failed");
    renderResult(lead, result);
    submitButton.textContent = result.duplicate ? "Already requested" : result.found ? "Report emailed" : "Request received";
    setStatus(
      result.duplicate
        ? "This email or WhatsApp number has already requested a free report."
        : result.found
        ? "Your PDF report has been sent to your email."
        : "Request received. We will prepare this report manually and email you within 1–3 working days.",
      result.duplicate ? "error" : "success",
    );
    updateReportCountFromResult(result, !result.duplicate);
  } catch (error) {
    notifyClientError(lead, error);
    showGenericError(error);
    submitButton.disabled = false;
    submitButton.textContent = "Get My Instant Report";
  } finally {
    if (optimisticSentTimer) window.clearTimeout(optimisticSentTimer);
    isSubmitting = false;
  }
}

function collectLead() {
  return {
    name: document.querySelector("#name").value.trim(),
    email: document.querySelector("#email").value.trim(),
    whatsapp: document.querySelector("#whatsapp").value.trim(),
    condo: document.querySelector("#condo").value.trim(),
    submittedAt: new Date().toISOString(),
  };
}

function validateLead(lead) {
  if (!lead.name) return "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) return "Please enter a valid email address.";
  if (!isSingaporeWhatsapp(lead.whatsapp)) return "Please enter a valid Singapore WhatsApp number, e.g. 91234567, 6591234567 or +6591234567.";
  if (!lead.condo) return "Please enter the condo name.";
  return "";
}

function demoLookup(lead) {
  const match = demoCondos.find((condo) => normalize(condo.developmentName) === normalize(lead.condo));
  if (match) return { ok: true, found: true, report: match };
  return { ok: true, found: false };
}

function submitToAppsScript(lead) {
  return appsScriptBridge("bridgeSubmitLead", {
    payload: encodePayload(lead),
    submitMode: "postmessage-bridge",
    v: CONFIG.frontendVersion,
  }, "POST", 330000);
}

function encodePayload(lead) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(lead))));
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function notifyClientError(lead, error) {
  if (!CONFIG.appsScriptUrl) return;
  jsonp(CONFIG.appsScriptUrl, {
    action: "clientError",
    payload: encodePayload(lead),
    error: `${CONFIG.frontendVersion}: ${error?.message || "Unknown web app error"}`,
    userAgent: navigator.userAgent || "",
    pageUrl: window.location.href,
  }, 20000).catch(() => {});
}

function incrementVisibleReportCount() {
  if (!reportCountEl) return;
  const current = Number(String(reportCountEl.textContent || "").replace(/\D/g, ""));
  const next = Math.max(Number.isFinite(current) ? current + 1 : 0, displayedReportCount + 1, CONFIG.defaultReportCount + 1);
  displayedReportCount = next;
  reportCountTarget = Math.max(reportCountTarget, next);
  reportCountEl.textContent = next.toLocaleString("en-SG");
}

function updateReportCountFromResult(result, shouldIncrementFallback) {
  if (!reportCountEl) return;
  if (shouldIncrementFallback) incrementVisibleReportCount();
}

function renderRequestReceivedPending(lead) {
  resultSection.hidden = false;
  document.querySelector("#resultTitle").textContent = "Request received";
  reportMount.innerHTML = `
    <div class="manual-message">
      <p class="eyebrow">Report request</p>
      <h3>Your request has been received.</h3>
      <p>
        We are preparing your Condo Buyability Report and sending it to
        <strong>${escapeHtml(lead.email)}</strong>. Please check your email shortly.
      </p>
      <a class="whatsapp-button" href="${whatsappLink(lead)}" target="_blank" rel="noreferrer">WhatsApp Us</a>
    </div>`;
  scrollToResult();
}

function renderResult(lead, result) {
  resultSection.hidden = false;

  if (result.duplicate) {
    document.querySelector("#resultTitle").textContent = "Report already requested";
    reportMount.innerHTML = `
      <div class="manual-message">
        <p class="eyebrow">One free report per person</p>
        <h3>You have already requested a free report before.</h3>
        <p>Each email or WhatsApp number is entitled to one free Condo Buyability Report.</p>
        <p>If you would like to check another condo, please contact us directly.</p>
        <a class="whatsapp-button" href="${duplicateWhatsappLink(lead, result)}" target="_blank" rel="noreferrer">WhatsApp Us</a>
      </div>`;
    scrollToResult();
    return;
  }

  if (!result.found) {
    document.querySelector("#resultTitle").textContent = "Development under Review";
    reportMount.innerHTML = `
      <div class="manual-message">
        <p class="eyebrow">Development under Review</p>
        <h3>Thank you ${escapeHtml(lead.name)}.</h3>
        <p>
          This development is currently being added to our research database. In the meantime, we will prepare
          your report personally and email it to you within 1–3 working days.
        </p>
        <a class="whatsapp-button" href="${whatsappLink(lead)}" target="_blank" rel="noreferrer">WhatsApp Us for faster response</a>
      </div>`;
    scrollToResult();
    return;
  }

  document.querySelector("#resultTitle").textContent = "Your report has been sent";
  reportMount.innerHTML = `
    <div class="manual-message">
      <p class="eyebrow">Report sent</p>
      <h3>Your Free Condo Buyability Report has been sent to your email.</h3>
      <p>
        Please check <strong>${escapeHtml(lead.email)}</strong>.
      </p>
      <a class="whatsapp-button" href="${whatsappLink(lead)}" target="_blank" rel="noreferrer">WhatsApp Us</a>
    </div>`;
  scrollToResult();
}

function showGenericError(error) {
  const message = "We could not generate the report at the moment. Please contact us directly on WhatsApp and we will help you from there.";
  setStatus(message, "error");
  resultSection.hidden = false;
  document.querySelector("#resultTitle").textContent = "Report request needs help";
  reportMount.innerHTML = `
    <div class="manual-message">
      <p class="eyebrow">Report request</p>
      <h3>We could not generate the report at the moment.</h3>
      <p>Please contact us directly on WhatsApp and we will help you from there.</p>
      ${error ? `<p class="error-detail">Error detail: ${escapeHtml(error.message || "Request failed")}</p>` : ""}
      <a class="whatsapp-button" href="${errorWhatsappLink()}" target="_blank" rel="noreferrer">WhatsApp Us</a>
    </div>`;
  scrollToResult();
}


function infoRows(report) {
  return [
    ["Region", report.region],
    ["District", report.district],
    ["TOP", report.topYear],
    ["Tenure", report.tenure],
    ["Total Units", report.totalUnits],
    ["Developer", report.developer],
    ["Nearest MRT", report.nearestMrt],
    ["Primary School", report.primarySchool],
    ["Malls", report.malls],
    ["Urban Transformation", report.urbanTransformation],
  ];
}

function whatsappLink(lead) {
  const text = `Hi, this is regarding my Buyability Report at ${lead.condo}. I would like to complete the report.\n\nThe listing URL, if any:\n\nIf not,\nBedroom type:\nFloor area:\n\nOr if I would like to compare another condo,\nCondo name:\nBedroom type:\nFloor area:`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function duplicateWhatsappLink(lead, result) {
  const condo = result.matchedDevelopment || lead.condo;
  const text = `Hi, I have already downloaded your Free Buyability Report for ${condo}. I would also like to check on:\n\nCondo:\nBedroom Type:\nListing URL if any:`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function errorWhatsappLink() {
  const lead = collectLead();
  const text = `Hi, I tried to download your Buyability Report for ${lead.condo || "this condo"} but there was an error.`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `form-status ${type || ""}`.trim();
}

function setNode(root, field, value) {
  const node = root.querySelector(`[data-field="${field}"]`);
  if (node) node.textContent = value ?? "";
}

function scrollToResult() {
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyBridgeFrameStyles(iframe) {
  iframe.width = "1";
  iframe.height = "1";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0.01";
  iframe.style.border = "0";
}

function appsScriptBridge(action, params = {}, method = "GET", timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const requestId = `bridge_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const frameName = `appsScriptBridge_${requestId}`;
    const iframe = document.createElement("iframe");
    let form = null;
    let timeout = null;

    function cleanup() {
      window.removeEventListener("message", onMessage);
      if (timeout) window.clearTimeout(timeout);
      if (form) form.remove();
      iframe.remove();
    }

    function onMessage(event) {
      const data = event.data || {};
      if (data.source !== "condoBuyabilityAppsScriptBridge" || data.requestId !== requestId) return;
      cleanup();
      resolve(data);
    }

    iframe.name = frameName;
    iframe.title = "Apps Script response bridge";
    applyBridgeFrameStyles(iframe);
    document.body.appendChild(iframe);
    window.addEventListener("message", onMessage);

    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Apps Script response timed out."));
    }, timeoutMs);

    const fields = {
      ...params,
      action,
      bridgeRequestId: requestId,
      bridgeOrigin: window.location.origin,
    };

    form = document.createElement("form");
    form.method = method.toUpperCase() === "POST" ? "POST" : "GET";
    form.action = CONFIG.appsScriptUrl;
    form.target = frameName;
    form.style.display = "none";

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value == null ? "" : String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  });
}

function jsonp(url, params, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const callback = `condoScorecard_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const fullUrl = new URL(url);
    Object.entries(params).forEach(([key, value]) => fullUrl.searchParams.set(key, value));
    fullUrl.searchParams.set("callback", callback);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out"));
    }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
    }
    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Request failed"));
    };
    script.src = fullUrl.toString();
    document.body.appendChild(script);
  });
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(date) {
  return date.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateForFile(date) {
  return date.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }).replace(/\s/g, "-");
}

function isSingaporeWhatsapp(value) {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[\s-]/g, "");
  if (/^[89]\d{7}$/.test(compact)) return true;
  if (/^65[89]\d{7}$/.test(compact)) return true;
  return /^\+65[89]\d{7}$/.test(compact);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

init();
