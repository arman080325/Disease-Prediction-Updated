/* ═══════════════════════════════════════════════════════════════
   Vitals Check — frontend logic
   Talks to the FastAPI backend defined in config.js (API_BASE).
   Same API contract as before: /api/meta, /api/predict, /api/report, /health
   ═══════════════════════════════════════════════════════════════ */

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 50; // r=50 in the SVG
const HISTORY_KEY = "vitalscheck_history";
const HISTORY_MAX = 8;

const RISK_GUIDANCE = {
  Low: "Symptoms suggest a mild condition. Monitor and rest.",
  Medium: "Consider seeing a doctor if symptoms persist or worsen.",
  High: "Recommend consulting a doctor soon.",
  Critical: "Seek medical attention promptly.",
};

/* Keyword-based grouping — the API returns a flat symptom list with no
   category field, so we classify client-side for a friendlier picker. */
const CATEGORY_RULES = [
  { name: "General", keywords: ["fever", "chill", "fatigue", "weight", "sweat", "malaise", "weak", "dehydrat", "loss_of_appetite", "lethargy"] },
  { name: "Respiratory", keywords: ["cough", "breath", "chest", "throat", "nose", "sinus", "phlegm", "mucus", "sneeze", "congestion"] },
  { name: "Digestive", keywords: ["stomach", "abdomen", "nausea", "vomit", "diarrhea", "constipation", "appetite", "bowel", "belly", "acid", "indigestion"] },
  { name: "Skin & hair", keywords: ["skin", "rash", "itch", "nail", "hair", "blister", "patch", "pus", "peeling", "bruis", "pigmentation"] },
  { name: "Neurological", keywords: ["head", "dizz", "numb", "tingl", "balance", "memory", "seizure", "vision", "speech", "concentrat", "coma", "slurred"] },
  { name: "Musculoskeletal", keywords: ["joint", "muscle", "back", "neck", "knee", "stiff", "cramp", "swelling", "movement"] },
  { name: "Urinary & other", keywords: ["urine", "urination", "kidney", "bladder"] },
];
function categorize(label) {
  const l = label.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => l.includes(k))) return rule.name;
  }
  return "Other";
}

const QUICK_ADD_CANDIDATES = [
  "fever", "headache", "cough", "fatigue", "nausea", "vomiting",
  "chills", "joint_pain", "stomach_pain", "skin_rash", "dizziness", "chest_pain",
];

const state = {
  allSymptoms: [],       // [{key, label, group}]
  groups: [],            // [{name, items}]
  selected: new Set(),
  lastResult: null,
  lastPatient: null,
};

const els = {
  symptomSearch: document.getElementById("symptomSearch"),
  symptomGroups: document.getElementById("symptomGroups"),
  quickAdd: document.getElementById("quickAdd"),
  selectedChips: document.getElementById("selectedChips"),
  selectedCount: document.getElementById("selectedCount"),
  predictBtn: document.getElementById("predictBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  shareBtn: document.getElementById("shareBtn"),
  resetBtn: document.getElementById("resetBtn"),

  resultsEmpty: document.getElementById("resultsEmpty"),
  resultsContent: document.getElementById("resultsContent"),
  riskBanner: document.getElementById("riskBanner"),
  resultRisk: document.getElementById("resultRisk"),
  riskGuidance: document.getElementById("riskGuidance"),
  resultConfidence: document.getElementById("resultConfidence"),
  resultDisease: document.getElementById("resultDisease"),
  gaugeFill: document.getElementById("gaugeFill"),
  infoDescription: document.getElementById("infoDescription"),
  infoTests: document.getElementById("infoTests"),
  infoSuggestions: document.getElementById("infoSuggestions"),
  predictionBars: document.getElementById("predictionBars"),
  explainBars: document.getElementById("explainBars"),
  explainMethodTag: document.getElementById("explainMethodTag"),
  explainNote: document.getElementById("explainNote"),

  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),

  patientName: document.getElementById("patientName"),
  patientAge: document.getElementById("patientAge"),
  patientGender: document.getElementById("patientGender"),
  patientDuration: document.getElementById("patientDuration"),

  themeToggle: document.getElementById("themeToggle"),
  stepper: document.querySelectorAll(".vt-step"),
};

/* ── theme toggle ─────────────────────────────────────────────────── */
(function initTheme() {
  const saved = localStorage.getItem("vitalscheck_theme");
  const theme = saved || "light";
  document.documentElement.setAttribute("data-theme", theme);
  els.themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
})();
els.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("vitalscheck_theme", next);
  els.themeToggle.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
});

/* ── mobile stepper ───────────────────────────────────────────────── */
function setActiveStep(step) {
  els.stepper.forEach((btn) => {
    const isActive = btn.dataset.step === step;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active-step", panel.dataset.panel === step);
  });
}
els.stepper.forEach((btn) => btn.addEventListener("click", () => setActiveStep(btn.dataset.step)));
setActiveStep("patient");

/* ── init: load symptom list from the API ─────────────────────────── */
async function init() {
  els.symptomGroups.innerHTML = `<p class="vt-muted"><span class="vt-spinner"></span>Loading symptom list…</p>`;
  try {
    const res = await fetch(`${API_BASE}/api/meta`);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    state.allSymptoms = data.symptoms.map((s) => ({ ...s, group: categorize(s.label) }));
    buildGroups();
    renderGroups(state.allSymptoms);
    renderQuickAdd();
    renderHistory();
  } catch (err) {
    els.symptomGroups.innerHTML = `<div class="vt-error-banner">Couldn't reach the prediction API. Is the backend deployed and is API_BASE in config.js set correctly?<br><small>${escapeHtml(err.message)}</small></div>`;
  }
}

function buildGroups() {
  const order = CATEGORY_RULES.map((r) => r.name).concat("Other");
  const byName = new Map();
  state.allSymptoms.forEach((s) => {
    if (!byName.has(s.group)) byName.set(s.group, []);
    byName.get(s.group).push(s);
  });
  state.groups = order.filter((name) => byName.has(name)).map((name) => ({ name, items: byName.get(name) }));
}

function renderQuickAdd() {
  const keys = new Set(state.allSymptoms.map((s) => s.key));
  let candidates = QUICK_ADD_CANDIDATES.filter((k) => keys.has(k));
  if (candidates.length < 6) {
    candidates = state.allSymptoms.slice(0, 8).map((s) => s.key);
  }
  els.quickAdd.innerHTML = candidates
    .map((key) => {
      const label = state.allSymptoms.find((s) => s.key === key)?.label || key;
      return `<button type="button" class="vt-quick-chip" data-key="${key}">+ ${escapeHtml(label)}</button>`;
    })
    .join("");
  els.quickAdd.querySelectorAll(".vt-quick-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.key;
      if (state.selected.has(key)) {
        state.selected.delete(key);
      } else {
        state.selected.add(key);
      }
      syncAllUI();
    });
  });
}

/* ── grouped, collapsible symptom checklist ───────────────────────── */
function renderGroups(list, opts = {}) {
  const { searching = false } = opts;
  if (!list.length) {
    els.symptomGroups.innerHTML = `<p class="vt-muted">No symptoms match your search.</p>`;
    return;
  }
  const byName = new Map();
  list.forEach((s) => {
    if (!byName.has(s.group)) byName.set(s.group, []);
    byName.get(s.group).push(s);
  });
  const order = state.groups.map((g) => g.name).filter((name) => byName.has(name));

  els.symptomGroups.innerHTML = order
    .map((name) => {
      const items = byName.get(name);
      const checkedCount = items.filter((s) => state.selected.has(s.key)).length;
      const openClass = searching || checkedCount > 0 ? "is-open" : "";
      const rows = items
        .map(
          (s) => `
        <label class="vt-symptom-item ${state.selected.has(s.key) ? "is-checked" : ""}" data-key="${s.key}">
          <input type="checkbox" value="${s.key}" ${state.selected.has(s.key) ? "checked" : ""} />
          <span>${escapeHtml(s.label)}</span>
        </label>`,
        )
        .join("");
      return `
      <div class="vt-group ${openClass}" data-group="${escapeHtml(name)}">
        <button type="button" class="vt-group-head">
          <span class="vt-group-head-left">${escapeHtml(name)} <span class="vt-group-count">${checkedCount ? checkedCount + "/" : ""}${items.length}</span></span>
          <svg class="vt-group-chevron" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <div class="vt-group-body">${rows}</div>
      </div>`;
    })
    .join("");

  els.symptomGroups.querySelectorAll(".vt-group-head").forEach((head) => {
    head.addEventListener("click", () => head.parentElement.classList.toggle("is-open"));
  });
  els.symptomGroups.querySelectorAll(".vt-symptom-item").forEach((row) => {
    row.querySelector("input").addEventListener("change", (e) => {
      const key = row.dataset.key;
      if (e.target.checked) state.selected.add(key);
      else state.selected.delete(key);
      syncAllUI();
    });
  });
}

function syncAllUI() {
  const q = els.symptomSearch.value.trim().toLowerCase();
  const filtered = q ? state.allSymptoms.filter((s) => s.label.toLowerCase().includes(q)) : state.allSymptoms;
  renderGroups(filtered, { searching: !!q });
  renderChips();
  renderQuickAddState();
  updatePredictButton();
}

function renderQuickAddState() {
  els.quickAdd.querySelectorAll(".vt-quick-chip").forEach((chip) => {
    chip.classList.toggle("is-added", state.selected.has(chip.dataset.key));
  });
}

function renderChips() {
  const labelFor = (key) => state.allSymptoms.find((s) => s.key === key)?.label || key;
  els.selectedChips.innerHTML = [...state.selected]
    .map(
      (key) => `
      <span class="vt-chip" data-key="${key}">
        ${escapeHtml(labelFor(key))}
        <button type="button" aria-label="Remove ${escapeHtml(labelFor(key))}">×</button>
      </span>`,
    )
    .join("");
  els.selectedCount.textContent = `${state.selected.size} selected`;

  els.selectedChips.querySelectorAll(".vt-chip button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.parentElement.dataset.key;
      state.selected.delete(key);
      syncAllUI();
    });
  });
}

function updatePredictButton() {
  els.predictBtn.disabled = state.selected.size === 0;
}

els.symptomSearch.addEventListener("input", syncAllUI);

/* ── predict ──────────────────────────────────────────────────────── */
els.predictBtn.addEventListener("click", async () => {
  if (state.selected.size === 0) return;

  setPredicting(true);
  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: [...state.selected], top_n: 5 }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Server responded ${res.status}`);
    }
    const result = await res.json();
    state.lastResult = result;
    state.lastPatient = {
      name: els.patientName.value || "Anonymous",
      age: Number(els.patientAge.value) || 25,
      gender: els.patientGender.value,
      duration_days: Number(els.patientDuration.value) || 0,
    };
    renderResults(result);
    saveToHistory(result);
    if (window.matchMedia("(max-width: 900px)").matches) setActiveStep("results");
  } catch (err) {
    showResultsError(err.message);
  } finally {
    setPredicting(false);
  }
});

function setPredicting(isLoading) {
  els.predictBtn.disabled = isLoading || state.selected.size === 0;
  els.predictBtn.innerHTML = isLoading
    ? `<span class="vt-spinner"></span> Predicting…`
    : `<span class="vt-btn-icon"><svg viewBox="0 0 24 24"><path d="M3 12h4l2-8 4 16 2-8h6"/></svg></span>Predict Disease`;
}

function showResultsError(message) {
  els.resultsEmpty.hidden = true;
  els.resultsContent.hidden = false;
  els.resultsContent.innerHTML = `<div class="vt-error-banner">${escapeHtml(message)}</div>`;
}

function renderResults(result) {
  els.resultsEmpty.hidden = true;
  els.resultsContent.hidden = false;
  // renderResults can be called after an error state wiped resultsContent's innerHTML
  // (e.g. re-viewing history after a failed live call); rebuild is unnecessary since
  // showResultsError only runs on the live-predict path, so the markup is intact here.

  els.riskBanner.dataset.level = result.risk_level;
  els.resultRisk.textContent = result.risk_level;
  els.riskGuidance.textContent = RISK_GUIDANCE[result.risk_level] || "Consult a doctor to confirm this result.";
  els.resultConfidence.textContent = `${(result.best_probability * 100).toFixed(1)}%`;
  els.resultDisease.textContent = result.best_disease;

  const offset = GAUGE_CIRCUMFERENCE * (1 - result.best_probability);
  requestAnimationFrame(() => { els.gaugeFill.style.strokeDashoffset = offset; });

  els.infoDescription.textContent = result.disease_info.description;
  els.infoTests.textContent = result.disease_info.tests;
  els.infoSuggestions.textContent = result.disease_info.suggestions;

  els.predictionBars.innerHTML = result.predictions
    .map((p) => {
      const pct = (p.probability * 100).toFixed(1);
      return `
      <div class="vt-bar-row">
        <div class="vt-bar-row-label">
          <span>${escapeHtml(p.disease)}</span>
          <span>${pct}%</span>
        </div>
        <div class="vt-bar-track"><div class="vt-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    })
    .join("");

  const exp = result.explainability;
  els.explainMethodTag.textContent =
    exp.method === "shap" ? "SHAP" : exp.method === "feature_importance" ? "Feature Importance" : "Unavailable";
  if (exp.note) {
    els.explainNote.hidden = false;
    els.explainNote.textContent = exp.note;
  } else {
    els.explainNote.hidden = true;
  }

  if (exp.top_features.length) {
    const maxAbs = Math.max(...exp.top_features.map((f) => Math.abs(f.impact)), 0.0001);
    els.explainBars.innerHTML = exp.top_features
      .map((f) => {
        const widthPct = (Math.abs(f.impact) / maxAbs) * 100;
        const cls = f.impact >= 0 ? "vt-bar-fill--explain-pos" : "vt-bar-fill--explain-neg";
        return `
        <div class="vt-bar-row">
          <div class="vt-bar-row-label">
            <span>${escapeHtml(f.symptom)}</span>
            <span>${f.impact.toFixed(3)}</span>
          </div>
          <div class="vt-bar-track"><div class="vt-bar-fill ${cls}" style="width:${widthPct}%"></div></div>
        </div>`;
      })
      .join("");
  } else {
    els.explainBars.innerHTML = `<p class="vt-muted">No explainability data available for this prediction.</p>`;
  }
}

/* ── reset ────────────────────────────────────────────────────────── */
els.resetBtn.addEventListener("click", () => {
  state.selected.clear();
  state.lastResult = null;
  state.lastPatient = null;
  els.symptomSearch.value = "";
  syncAllUI();
  els.resultsContent.hidden = true;
  els.resultsEmpty.hidden = false;
  if (window.matchMedia("(max-width: 900px)").matches) setActiveStep("symptoms");
});

/* ── share summary ────────────────────────────────────────────────── */
els.shareBtn.addEventListener("click", async () => {
  if (!state.lastResult) return;
  const r = state.lastResult;
  const text = `Vitals Check result: ${r.best_disease} (${(r.best_probability * 100).toFixed(1)}% confidence, ${r.risk_level} risk). This is an ML screening tool, not a diagnosis — see a doctor to confirm.`;
  if (navigator.share) {
    try { await navigator.share({ title: "Vitals Check result", text }); } catch { /* user cancelled */ }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      const original = els.shareBtn.innerHTML;
      els.shareBtn.textContent = "Copied to clipboard ✓";
      setTimeout(() => { els.shareBtn.innerHTML = original; }, 1800);
    } catch {
      alert(text);
    }
  }
});

/* ── PDF download ─────────────────────────────────────────────────── */
els.downloadBtn.addEventListener("click", async () => {
  if (!state.lastResult || state.selected.size === 0) return;

  const originalHtml = els.downloadBtn.innerHTML;
  els.downloadBtn.innerHTML = `<span class="vt-spinner"></span> Generating…`;
  els.downloadBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: state.lastPatient || {
          name: els.patientName.value || "Anonymous",
          age: Number(els.patientAge.value) || 25,
          gender: els.patientGender.value,
          duration_days: Number(els.patientDuration.value) || 0,
        },
        symptoms: [...state.selected],
        top_n: 5,
      }),
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(els.patientName.value || "patient").replace(/[^a-z0-9_\- ]/gi, "")}_Disease_Prediction_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(`Couldn't generate the PDF: ${err.message}`);
  } finally {
    els.downloadBtn.innerHTML = originalHtml;
    els.downloadBtn.disabled = false;
  }
});

/* ── history (localStorage, this device only) ─────────────────────── */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveToHistory(result) {
  const entry = {
    id: Date.now(),
    disease: result.best_disease,
    confidence: result.best_probability,
    risk: result.risk_level,
    date: new Date().toISOString(),
    symptoms: [...state.selected],
    result,
    patient: state.lastPatient,
  };
  const list = [entry, ...loadHistory()].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  renderHistory();
}
function renderHistory() {
  const list = loadHistory();
  if (!list.length) {
    els.historyList.innerHTML = `<p class="vt-muted">Your last few checks on this device will appear here.</p>`;
    return;
  }
  els.historyList.innerHTML = list
    .map((entry) => {
      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return `
      <div class="vt-history-item" data-id="${entry.id}">
        <div class="vt-history-item-main">
          <span class="vt-history-disease">${escapeHtml(entry.disease)}</span>
          <span class="vt-history-meta">${dateStr} · ${escapeHtml(entry.risk)} risk</span>
        </div>
        <span class="vt-history-conf">${(entry.confidence * 100).toFixed(0)}%</span>
      </div>`;
    })
    .join("");

  els.historyList.querySelectorAll(".vt-history-item").forEach((row) => {
    row.addEventListener("click", () => {
      const entry = list.find((e) => String(e.id) === row.dataset.id);
      if (!entry) return;
      state.selected = new Set(entry.symptoms);
      state.lastResult = entry.result;
      state.lastPatient = entry.patient;
      if (entry.patient) {
        els.patientName.value = entry.patient.name;
        els.patientAge.value = entry.patient.age;
        els.patientGender.value = entry.patient.gender;
        els.patientDuration.value = entry.patient.duration_days;
      }
      syncAllUI();
      renderResults(entry.result);
      if (window.matchMedia("(max-width: 900px)").matches) setActiveStep("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}
els.clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

/* ── utils ────────────────────────────────────────────────────────── */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

init();