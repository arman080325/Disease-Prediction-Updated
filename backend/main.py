"""
Disease Prediction API — FastAPI backend

Ports the original Streamlit app's model logic to a stateless REST API:
  GET  /api/meta        -> symptom list, disease count, model info
  POST /api/predict     -> ranked disease predictions + risk level + SHAP explainability
  POST /api/report      -> the same prediction, packaged as a downloadable PDF
  GET  /health          -> liveness check for Render

The ML pipeline itself (VotingClassifier of RandomForest + ExtraTrees, trained on
132 Kaggle symptoms -> 41 diseases) is unchanged from the original project —
only the delivery mechanism changed, from a Streamlit script rerun to a real API.
"""

import io
import json
import os
from datetime import datetime, timezone
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from disease_info import get_disease_info

try:
    import shap

    SHAP_AVAILABLE = True
except Exception:
    SHAP_AVAILABLE = False

import matplotlib

matplotlib.use("Agg")  # headless rendering, required on a server
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "artifacts", "model.joblib")
ENCODER_PATH = os.path.join(BASE_DIR, "artifacts", "label_encoder.joblib")
SYMPTOMS_JSON = os.path.join(BASE_DIR, "data", "symptoms.json")

# ── allow your Vercel frontend + local dev to call this API ──────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]
# Add your real Vercel URL(s) here once deployed, e.g.:
# ALLOWED_ORIGINS.append("https://disease-prediction.vercel.app")
extra_origin = os.environ.get("FRONTEND_ORIGIN")
if extra_origin:
    ALLOWED_ORIGINS.append(extra_origin)

app = FastAPI(title="Disease Prediction API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── load model artifacts once, at process startup ─────────────────────────
_model = None
_label_encoder = None
_symptom_names: List[str] = []


@app.on_event("startup")
def load_artifacts():
    global _model, _label_encoder, _symptom_names
    _model = joblib.load(MODEL_PATH)
    _label_encoder = joblib.load(ENCODER_PATH) if os.path.exists(ENCODER_PATH) else None
    with open(SYMPTOMS_JSON, "r", encoding="utf-8") as f:
        _symptom_names = json.load(f)


def humanize(symptom: str) -> str:
    """snake_case -> Title Case for display, e.g. 'skin_rash' -> 'Skin rash'."""
    words = symptom.replace("_", " ").strip()
    return words[:1].upper() + words[1:] if words else words


def get_risk_level(prob: float) -> str:
    if prob >= 0.85:
        return "Critical"
    elif prob >= 0.65:
        return "High"
    elif prob >= 0.40:
        return "Medium"
    else:
        return "Low"


def build_feature_vector(selected_symptoms: List[str], symptom_names: List[str]) -> pd.DataFrame:
    vals = [1 if s in selected_symptoms else 0 for s in symptom_names]
    return pd.DataFrame([vals], columns=symptom_names)


def explain_prediction(model, X_instance: pd.DataFrame, feature_names: List[str]):
    """
    Try SHAP TreeExplainer first (may not support VotingClassifier); fall back
    to averaged feature_importances_ across the ensemble's base estimators.
    Returns (top_features: list[(name, value)], method: str, note: Optional[str]).
    """
    if SHAP_AVAILABLE:
        try:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_instance)

            if isinstance(shap_values, list):
                pred_proba = model.predict_proba(X_instance)[0]
                pred_class_idx = int(np.argmax(pred_proba))
                shap_vals = shap_values[pred_class_idx][0]
            else:
                shap_vals = shap_values[0]

            abs_vals = np.abs(shap_vals)
            top_idx = np.argsort(abs_vals)[::-1][:10]
            top_feats = [feature_names[i] for i in top_idx]
            top_importance = [float(shap_vals[i]) for i in top_idx]
            return list(zip(top_feats, top_importance)), "shap", None
        except Exception:
            pass

    # fallback: feature_importances_ (VotingClassifier -> average over estimators_)
    try:
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        elif hasattr(model, "estimators_"):
            est_importances = [
                est.feature_importances_
                for est in model.estimators_
                if hasattr(est, "feature_importances_")
            ]
            if not est_importances:
                return [], "unavailable", "No feature_importances_ found on base estimators."
            importances = np.mean(est_importances, axis=0)
        else:
            return [], "unavailable", "Model has no feature_importances_."

        importances = np.array(importances)
        top_idx = np.argsort(importances)[::-1][:10]
        top_feats = [feature_names[i] for i in top_idx]
        top_vals = [float(importances[i]) for i in top_idx]
        note = "SHAP unavailable for this ensemble — showing feature importance instead."
        return list(zip(top_feats, top_vals)), "feature_importance", note
    except Exception as e:
        return [], "unavailable", f"Explainability unavailable: {e}"


def make_shap_figure(top_features, method: str, note: Optional[str]):
    """Render the same style bar chart as the original app, for PDF embedding."""
    if not top_features:
        return None
    feats = [humanize(f) for f, _ in top_features][::-1]
    vals = [v for _, v in top_features][::-1]
    color = "skyblue" if method == "shap" else "lightgreen"
    title = (
        "Top 10 Symptoms Influencing Prediction (SHAP)"
        if method == "shap"
        else "Top 10 Influencing Symptoms (Feature Importance)"
    )
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.barh(feats, vals, color=color)
    ax.set_title(title)
    ax.set_xlabel("Impact on model output" if method == "shap" else "Importance")
    if note:
        ax.text(0.5, -0.22, note, ha="center", va="center", transform=ax.transAxes, fontsize=8)
    plt.tight_layout()
    return fig


def draw_section_title(pdf, x, y, title):
    pdf.setFont("Helvetica-Bold", 14)
    pdf.setFillColor(colors.HexColor("#184e77"))
    pdf.drawString(x, y, title)
    pdf.setFillColor(colors.black)
    pdf.setLineWidth(0.5)
    pdf.line(x, y - 3, x + 500, y - 3)


def generate_pdf(patient_name, patient_info, prediction_info, disease_info, top_probs, shap_fig=None) -> io.BytesIO:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    pdf.setFillColor(colors.HexColor("#1d3557"))
    pdf.rect(0, height - 80, width, 80, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(40, height - 50, "Disease Prediction Report")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(400, height - 35, "ML-Powered Health Screening")
    pdf.drawString(400, height - 50, f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")

    y = height - 100
    draw_section_title(pdf, 40, y, "1. Patient Details")
    y -= 25
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, f"Patient Name: {patient_name}")
    y -= 20
    pdf.setFont("Helvetica", 11)
    for line in patient_info:
        pdf.drawString(50, y, f"- {line}")
        y -= 18
    y -= 10

    draw_section_title(pdf, 40, y, "2. Prediction Summary")
    y -= 25
    pdf.setFont("Helvetica-Bold", 11)
    for line in prediction_info:
        pdf.drawString(50, y, line)
        y -= 18
    y -= 10

    draw_section_title(pdf, 40, y, "3. Disease Overview (Top Prediction)")
    y -= 25
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, y, f"Description: {disease_info['description']}")
    y -= 18
    pdf.drawString(50, y, f"Common tests: {disease_info['tests']}")
    y -= 18
    pdf.drawString(50, y, f"General suggestions: {disease_info['suggestions']}")
    y -= 25

    draw_section_title(pdf, 40, y, "4. Model Top Predictions")
    y -= 25
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(50, y, "Disease")
    pdf.drawString(320, y, "Probability")
    y -= 15
    pdf.line(50, y, 520, y)
    y -= 10
    pdf.setFont("Helvetica", 11)
    for disease, prob in top_probs:
        pdf.drawString(50, y, str(disease))
        pdf.drawString(320, y, f"{prob:.2%}")
        y -= 16
    y -= 10

    if shap_fig is not None:
        if y < 250:
            pdf.showPage()
            y = height - 80
        draw_section_title(pdf, 40, y, "5. Explainability")
        y -= 20
        img_buf = io.BytesIO()
        shap_fig.savefig(img_buf, format="png", bbox_inches="tight")
        img_buf.seek(0)
        try:
            pdf.drawImage(ImageReader(img_buf), 50, y - 220, width=500, height=220)
            y -= 240
        except Exception:
            pdf.setFont("Helvetica", 10)
            pdf.drawString(50, y - 20, "Could not render explainability image.")
            y -= 40
        plt.close(shap_fig)

    if y < 120:
        pdf.showPage()
        y = height - 80
    draw_section_title(pdf, 40, y, "6. Important Disclaimer")
    y -= 25
    disclaimer = (
        "This report is generated by a machine learning model as part of a personal "
        "project. It is NOT a medical diagnosis and must not be used as a substitute "
        "for professional medical advice. Consult a qualified doctor for health concerns."
    )
    pdf.setFont("Helvetica-Oblique", 9)
    text_obj = pdf.beginText(50, y)
    text_obj.textLines(disclaimer)
    pdf.drawText(text_obj)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


# ── request/response schemas ───────────────────────────────────────────────
class PredictRequest(BaseModel):
    symptoms: List[str] = Field(..., min_items=1, description="Raw symptom keys, e.g. 'skin_rash'")
    top_n: int = Field(5, ge=1, le=10)


class PatientInfo(BaseModel):
    name: str = "Anonymous"
    age: int = Field(25, ge=1, le=120)
    gender: str = "Other"
    duration_days: int = Field(3, ge=0, le=365)


class ReportRequest(BaseModel):
    patient: PatientInfo
    symptoms: List[str] = Field(..., min_items=1)
    top_n: int = Field(5, ge=1, le=10)


def _run_prediction(symptoms: List[str], top_n: int):
    unknown = [s for s in symptoms if s not in _symptom_names]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown symptom key(s): {unknown}")

    X = build_feature_vector(symptoms, _symptom_names)

    if hasattr(_model, "predict_proba"):
        probs = _model.predict_proba(X)[0]
        class_labels = _label_encoder.classes_ if _label_encoder is not None else _model.classes_
        idx_sorted = np.argsort(probs)[::-1]
        pairs = [(str(class_labels[i]), float(probs[i])) for i in idx_sorted]
    else:
        pred_idx = _model.predict(X)[0]
        disease_name = _label_encoder.inverse_transform([pred_idx])[0]
        pairs = [(str(disease_name), 1.0)]

    best_disease, best_prob = pairs[0]
    info = get_disease_info(best_disease)
    top_features, method, note = explain_prediction(_model, X, _symptom_names)

    return {
        "predictions": [
            {"disease": d, "probability": p, "risk_level": get_risk_level(p)}
            for d, p in pairs[:top_n]
        ],
        "best_disease": best_disease,
        "best_probability": best_prob,
        "risk_level": get_risk_level(best_prob),
        "disease_info": info,
        "explainability": {
            "method": method,  # "shap" | "feature_importance" | "unavailable"
            "note": note,
            "top_features": [
                {"symptom": humanize(f), "impact": v} for f, v in top_features
            ],
        },
        "_raw_pairs": pairs[:top_n],  # internal use for PDF generation
    }


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/meta")
def meta():
    return {
        "symptom_count": len(_symptom_names),
        "disease_count": len(_label_encoder.classes_) if _label_encoder is not None else None,
        "symptoms": [{"key": s, "label": humanize(s)} for s in _symptom_names],
        "shap_available": SHAP_AVAILABLE,
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    result = _run_prediction(req.symptoms, req.top_n)
    result.pop("_raw_pairs", None)
    return result


@app.post("/api/report")
def report(req: ReportRequest):
    result = _run_prediction(req.symptoms, req.top_n)
    pairs = result.pop("_raw_pairs")

    X = build_feature_vector(req.symptoms, _symptom_names)
    top_features, method, note = explain_prediction(_model, X, _symptom_names)
    shap_fig = make_shap_figure(top_features, method, note)

    patient_info_lines = [
        f"Age: {req.patient.age}",
        f"Gender: {req.patient.gender}",
        f"Duration: {req.patient.duration_days} day(s)",
        f"Symptoms: {', '.join(humanize(s) for s in req.symptoms)}",
    ]
    prediction_info_lines = [
        f"Predicted disease: {result['best_disease']}",
        f"Model confidence: {result['best_probability']:.2%}",
        f"Risk level: {result['risk_level']}",
    ]

    pdf_buffer = generate_pdf(
        req.patient.name,
        patient_info_lines,
        prediction_info_lines,
        result["disease_info"],
        pairs,
        shap_fig,
    )

    safe_name = "".join(c for c in req.patient.name if c.isalnum() or c in " _-").strip() or "patient"
    filename = f"{safe_name}_Disease_Prediction_Report.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
