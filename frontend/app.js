/* ═══════════════════════════════════════════════════════════════
   Disease Prediction — frontend logic
   Talks to the FastAPI backend defined in config.js (API_BASE).
   ═══════════════════════════════════════════════════════════════ */

const state = {
  allSymptoms: [],       // [{key, label}]
  selected: new Set(),   // symptom keys
  lastResult: null,
};

const els = {
  symptomSearch: document.getElementById("symptomSearch"),
  symptomList: document.getElementById("symptomList"),
  selectedChips: document.getElementById("selectedChips"),
  predictBtn: document.getElementById("predictBtn"),
  downloadBtn: document.getElementById("downloadBtn"),

  resultsEmpty: document.getElementById("resultsEmpty"),
  resultsContent: document.getElementById("resultsContent"),
  resultRisk: document.getElementById("resultRisk"),
  resultConfidence: document.getElementById("resultConfidence"),
  resultDisease: document.getElementById("resultDisease"),
  infoDescription: document.getElementById("infoDescription"),
  infoTests: document.getElementById("infoTests"),
  infoSuggestions: document.getElementById("infoSuggestions"),
  predictionBars: document.getElementById("predictionBars"),
  explainBars: document.getElementById("explainBars"),
  explainMethodTag: document.getElementById("explainMethodTag"),
  explainNote: document.getElementById("explainNote"),

  patientName: document.getElementById("patientName"),
  patientAge: document.getElementById("patientAge"),
  patientGender: document.getElementById("patientGender"),
  patientDuration: document.getElementById("patientDuration"),
};

/* ── init: load symptom list from the API ─────────────────────────── */
async function init() {
  els.symptomList.innerHTML = `<p class="muted"><span class="spinner"></span>Loading symptom list…</p>`;
  try {
    const res = await fetch(`${API_BASE}/api/meta`);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    state.allSymptoms = data.symptoms;
    renderSymptomList(state.allSymptoms);
  } catch (err) {
    els.symptomList.innerHTML = `<div class="error-banner">Couldn't reach the prediction API. Is the backend deployed and is API_BASE in config.js set correctly?<br><small>${escapeHtml(err.message)}</small></div>`;
  }
}

function renderSymptomList(list) {
  if (!list.length) {
    els.symptomList.innerHTML = `<p class="muted">No symptoms match your search.</p>`;
    return;
  }
  els.symptomList.innerHTML = list
    .map(
      (s) => `
      <label class="symptom-item ${state.selected.has(s.key) ? "is-checked" : ""}" data-key="${s.key}">
        <input type="checkbox" value="${s.key}" ${state.selected.has(s.key) ? "checked" : ""} />
        <span>${escapeHtml(s.label)}</span>
      </label>`,
    )
    .join("");

  els.symptomList.querySelectorAll(".symptom-item").forEach((row) => {
    row.querySelector("input").addEventListener("change", (e) => {
      const key = row.dataset.key;
      if (e.target.checked) state.selected.add(key);
      else state.selected.delete(key);
      row.classList.toggle("is-checked", e.target.checked);
      renderChips();
      updatePredictButton();
    });
  });
}

function renderChips() {
  const labelFor = (key) => state.allSymptoms.find((s) => s.key === key)?.label || key;
  els.selectedChips.innerHTML = [...state.selected]
    .map(
      (key) => `
      <span class="chip" data-key="${key}">
        ${escapeHtml(labelFor(key))}
        <button type="button" aria-label="Remove ${escapeHtml(labelFor(key))}">×</button>
      </span>`,
    )
    .join("");

  els.selectedChips.querySelectorAll(".chip button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.parentElement.dataset.key;
      state.selected.delete(key);
      renderChips();
      updatePredictButton();
      // sync checkbox state if visible in current filtered list
      const row = els.symptomList.querySelector(`.symptom-item[data-key="${key}"]`);
      if (row) {
        row.classList.remove("is-checked");
        row.querySelector("input").checked = false;
      }
    });
  });
}

function updatePredictButton() {
  els.predictBtn.disabled = state.selected.size === 0;
}

els.symptomSearch.addEventListener("input", () => {
  const q = els.symptomSearch.value.trim().toLowerCase();
  const filtered = q
    ? state.allSymptoms.filter((s) => s.label.toLowerCase().includes(q))
    : state.allSymptoms;
  renderSymptomList(filtered);
});

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
    renderResults(result);
  } catch (err) {
    showResultsError(err.message);
  } finally {
    setPredicting(false);
  }
});

function setPredicting(isLoading) {
  els.predictBtn.disabled = isLoading || state.selected.size === 0;
  els.predictBtn.innerHTML = isLoading
    ? `<span class="spinner"></span> Predicting…`
    : `<span class="btn-icon">🔍</span> Predict Disease`;
}

function showResultsError(message) {
  els.resultsEmpty.hidden = true;
  els.resultsContent.hidden = false;
  els.resultsContent.innerHTML = `<div class="error-banner">${escapeHtml(message)}</div>`;
}

function renderResults(result) {
  els.resultsEmpty.hidden = true;
  els.resultsContent.hidden = false;

  els.resultRisk.textContent = result.risk_level;
  els.resultRisk.dataset.level = result.risk_level;
  els.resultConfidence.textContent = `Confidence: ${(result.best_probability * 100).toFixed(1)}%`;
  els.resultDisease.textContent = result.best_disease;

  els.infoDescription.textContent = result.disease_info.description;
  els.infoTests.textContent = result.disease_info.tests;
  els.infoSuggestions.textContent = result.disease_info.suggestions;

  els.predictionBars.innerHTML = result.predictions
    .map((p) => {
      const pct = (p.probability * 100).toFixed(1);
      return `
      <div class="bar-row">
        <div class="bar-row-label">
          <span>${escapeHtml(p.disease)}</span>
          <span>${pct}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
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
        const cls = f.impact >= 0 ? "bar-fill--explain-pos" : "bar-fill--explain-neg";
        return `
        <div class="bar-row">
          <div class="bar-row-label">
            <span>${escapeHtml(f.symptom)}</span>
            <span>${f.impact.toFixed(3)}</span>
          </div>
          <div class="bar-track"><div class="bar-fill ${cls}" style="width:${widthPct}%"></div></div>
        </div>`;
      })
      .join("");
  } else {
    els.explainBars.innerHTML = `<p class="muted">No explainability data available for this prediction.</p>`;
  }
}

/* ── PDF download ─────────────────────────────────────────────────── */
els.downloadBtn.addEventListener("click", async () => {
  if (!state.lastResult || state.selected.size === 0) return;

  const originalHtml = els.downloadBtn.innerHTML;
  els.downloadBtn.innerHTML = `<span class="spinner"></span> Generating…`;
  els.downloadBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: {
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

/* ── utils ────────────────────────────────────────────────────────── */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

init();
