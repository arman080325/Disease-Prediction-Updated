# Disease Prediction System — v2

Rebuilt from the original Streamlit app into a real, deployable web app:

```
backend/    FastAPI service — the ML model, SHAP explainability, and PDF report,
            all unchanged from the original app, now served over a REST API.
frontend/   Plain HTML/CSS/JS — a dark, medical-tech UI that calls the backend.
```

**Why this split:** Streamlit needs a persistent server process and cannot run on
Vercel's serverless functions. The model files (63MB) are also too large for a
serverless bundle. So the ML backend runs on **Render** (a real, always-on
container), and the frontend — which is just static HTML/CSS/JS — deploys to
**Vercel**, calling the Render API over `fetch()`.

Nothing about the model changed: same VotingClassifier (RandomForest + ExtraTrees),
same 132 Kaggle symptoms → 41 diseases, same `DISEASE_INFO` dictionary, same SHAP →
feature-importance fallback, same PDF report layout. Only the delivery mechanism
changed — a real API instead of a Streamlit script rerun.

---

## 1. Deploy the backend (Render)

1. Push this whole folder to a GitHub repo (or a new one — your call).
2. Render → **New → Web Service** → connect the repo.
3. **Root Directory:** `backend`
4. Render will auto-detect the `Dockerfile`. If it doesn't, set:
   - Build: *(leave blank, Docker handles it)*
   - Start command: *(leave blank, Docker's CMD handles it)*
5. **Health Check Path:** `/health`
6. No environment variables are required to boot. Once you deploy the frontend,
   come back and add:
   - `FRONTEND_ORIGIN` = your Vercel URL (e.g. `https://disease-prediction.vercel.app`)
     — this lets the browser actually call the API (CORS).
7. Deploy. First boot will take a minute (loading the 63MB model). Confirm
   `https://your-service.onrender.com/health` returns `{"status": "ok", ...}`.

> Render's free tier spins down after inactivity — the first request after idle
> can take 30–50s while it wakes up and reloads the model. This is the same
> behavior you've already seen with your other Render-hosted projects.

## 2. Deploy the frontend (Vercel)

1. Vercel → **New Project** → same repo.
2. **Root Directory:** `frontend`
3. Framework preset: **Other** (it's plain static files, no build step).
4. Deploy.
5. Open `frontend/config.js` in your repo and replace the placeholder with your
   real Render URL:
   ```js
   const API_BASE = "https://your-service.onrender.com";
   ```
6. Commit + push — Vercel redeploys automatically.
7. Go back to Render and set `FRONTEND_ORIGIN` to your real Vercel URL (step 1.6
   above), so the API accepts requests from it.

## 3. Verify end-to-end

1. Open your Vercel URL.
2. Select a few symptoms (try: fever, headache, nausea, vomiting, fatigue).
3. Click **Predict Disease** — you should see a ranked list, risk badge, disease
   info, and an explainability breakdown.
4. Click **Download PDF Report** — confirm a PDF downloads with the same sections
   as the original app (patient details, prediction summary, disease overview,
   top predictions, explainability chart, disclaimer).

## 4. Point your portfolio at it

In your portfolio's `data.js`, the `disease-ml` project entry currently has:
```js
demo: "https://disease-ml.vercel.app",
```
Update it to your real new Vercel URL once deployed. I can also build a fourth
animated hero card for this project (a symptom→prediction motif, distinct from
the scanner/ledger/terminal/browser ones already built) — just say the word once
this is live.

---

## What's identical to the original project
- Model: same `model.joblib` / `label_encoder.joblib`, same 132 → 41 mapping
- `DISEASE_INFO`: all 41 entries copied verbatim
- SHAP-first, feature-importance-fallback explainability logic
- PDF report: same sections, same disclaimer, same layout (via ReportLab)
- `requirements.txt` pins `scikit-learn==1.7.2` to match the version the model
  was actually trained with (the original had no pin, which risks a silent
  behavior change on a fresh install with a newer sklearn)

## What's new
- A real REST API (`/api/meta`, `/api/predict`, `/api/report`, `/health`) instead
  of a single Streamlit script
- A designed, searchable symptom picker instead of Streamlit's default multiselect
- JSON-based explainability data rendered as themed bar charts on-screen (the
  matplotlib chart is still generated server-side for the PDF, matching the
  original)
- CORS configured so only your frontend origin can call the API
