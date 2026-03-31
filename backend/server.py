"""
PredictaCare — Flask ML Server
================================
Serves predictions for 4 diseases × 2 tiers (free/premium)

Endpoints:
  GET  /api/health          → keep-alive ping from Node.js
  POST /predict/<disease>   → prediction (isPremium flag in body)

Diseases: diabetes | heart | pcos | stroke

Premium (DNN .h5):
  diabetes → full features including HbA1c + blood glucose
  heart    → progressive enhancement with ECG + lab values
  pcos     → progressive enhancement with AMH, LH, FSH + ultrasound
  stroke   → Beta — Kaggle dataset, limited accuracy

Free (XGBoost .pkl):
  diabetes → self-reported only (age, bmi, hypertension etc.)
  heart    → self-reported only (age, sex, cp, trestbps, exang)
  pcos     → self-reported symptoms only
  stroke   → Beta — same features as premium
"""

import os
import json
import traceback
import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://predictacare-1.onrender.com",
            "http://localhost:5173"
        ]
    }
})

# ─── Paths ────────────────────────────────────────────────────────────────────
H5_DIR     = "predictionModel/h5Model"
SCALER_DIR = "predictionModel/scalers"
LITE_DIR   = "predictionModel/lite_models"

# ─── Internal Secret ──────────────────────────────────────────────────────────
INTERNAL_SECRET = os.environ.get("INTERNAL_SECRET", "")

# ─── Lazy Model Cache ─────────────────────────────────────────────────────────
# Models loaded on first request, cached after
# Prevents memory crashes on Render free tier at startup
_premium_models    = {}   # { disease: keras_model }
_premium_scalers   = {}   # { disease: sklearn_scaler }
_premium_columns   = {}   # { disease: [col_names] }
_premium_thresholds = {}  # { disease: float }
_premium_medians   = {}   # { disease: {col: median} } — heart + pcos only

_lite_models       = {}   # { disease: xgb_model }
_lite_columns      = {}   # { disease: [col_names] }
_lite_thresholds   = {}   # { disease: float }

# ─── Artifact File Map ────────────────────────────────────────────────────────
PREMIUM_FILES = {
    "diabetes": {
        "model":     f"{H5_DIR}/diabetes_model.h5",
        "scaler":    f"{SCALER_DIR}/diabetes_scaler.pkl",
        "columns":   f"{SCALER_DIR}/diabetes_columns.pkl",
        "threshold": f"{SCALER_DIR}/diabetes_threshold.json",
        "medians":   f"{SCALER_DIR}/diabetes_medians.json",
    },
    "heart": {
        "model":     f"{H5_DIR}/heart_model.h5",
        "scaler":    f"{SCALER_DIR}/heart_scaler.pkl",
        "columns":   f"{SCALER_DIR}/heart_columns.pkl",
        "threshold": f"{SCALER_DIR}/heart_threshold.json",
        "medians":   f"{SCALER_DIR}/heart_medians.json",
    },
    "pcos": {
        "model":     f"{H5_DIR}/pcos_model.h5",
        "scaler":    f"{SCALER_DIR}/pcos_scaler.pkl",
        "columns":   f"{SCALER_DIR}/pcos_columns.pkl",
        "threshold": f"{SCALER_DIR}/pcos_threshold.json",
        "medians":   f"{SCALER_DIR}/pcos_medians.json",
    },
    "stroke": {
        "model":     f"{H5_DIR}/stroke_model.h5",
        "scaler":    f"{SCALER_DIR}/stroke_scaler.pkl",
        "columns":   f"{SCALER_DIR}/stroke_columns.pkl",
        "threshold": f"{SCALER_DIR}/stroke_threshold.json",
    },
}

LITE_FILES = {
    "diabetes": {
        "model":     f"{LITE_DIR}/diabetes_lite.pkl",
        "columns":   f"{LITE_DIR}/diabetes_lite_columns.pkl",
        "threshold": f"{LITE_DIR}/diabetes_lite_threshold.json",
    },
    "heart": {
        "model":     f"{LITE_DIR}/heart_lite.pkl",
        "columns":   f"{LITE_DIR}/heart_lite_columns.pkl",
        "threshold": f"{LITE_DIR}/heart_lite_threshold.json",
    },
    "pcos": {
        "model":     f"{LITE_DIR}/pcos_lite.pkl",
        "columns":   f"{LITE_DIR}/pcos_lite_columns.pkl",
        "threshold": f"{LITE_DIR}/pcos_lite_threshold.json",
    },
    "stroke": {
        "model":     f"{LITE_DIR}/stroke_lite.pkl",
        "columns":   f"{LITE_DIR}/stroke_lite_columns.pkl",
        "threshold": f"{LITE_DIR}/stroke_lite_threshold.json",
    },
}

# ─── Lazy Loaders ─────────────────────────────────────────────────────────────
def load_premium(disease):
    """Load premium DNN model + artifacts if not already cached."""
    if disease in _premium_models:
        return True

    files = PREMIUM_FILES.get(disease)
    if not files:
        return False

    try:
        from tensorflow.keras.models import load_model

        for path in files.values():
            if not os.path.exists(path):
                print(f"❌ Missing premium artifact for {disease}: {path}")
                return False

        _premium_models[disease]   = load_model(files["model"])
        _premium_scalers[disease]  = joblib.load(files["scaler"])
        _premium_columns[disease]  = joblib.load(files["columns"])

        with open(files["threshold"]) as f:
            _premium_thresholds[disease] = json.load(f)["threshold"]

        if "medians" in files:
            with open(files["medians"]) as f:
                _premium_medians[disease] = json.load(f)

        print(f"[OK] Premium model loaded: {disease}")
        return True

    except Exception as e:
        print(f"❌ Failed to load premium model for {disease}: {e}")
        return False


def load_lite(disease):
    """Load free tier XGBoost model + artifacts if not already cached."""
    if disease in _lite_models:
        return True

    files = LITE_FILES.get(disease)
    if not files:
        return False

    try:
        for path in files.values():
            if not os.path.exists(path):
                print(f"❌ Missing lite artifact for {disease}: {path}")
                return False

        _lite_models[disease]    = joblib.load(files["model"])
        _lite_columns[disease]   = joblib.load(files["columns"])

        with open(files["threshold"]) as f:
            _lite_thresholds[disease] = json.load(f)["threshold"]

        print(f"[OK] Lite model loaded: {disease}")
        return True

    except Exception as e:
        print(f"❌ Failed to load lite model for {disease}: {e}")
        return False


# ─── Risk Label ───────────────────────────────────────────────────────────────
def get_risk_label(prob, threshold):
    """
    Convert probability to risk label using saved threshold.
    Above threshold       = HIGH
    Within 10% below      = MODERATE
    Below that            = LOW
    """
    if prob >= threshold:
        return "HIGH"
    elif prob >= threshold * 0.9:
        return "MODERATE"
    else:
        return "LOW"


# ─── Premium Preprocessors ────────────────────────────────────────────────────
def preprocess_diabetes_premium(data):
    """
    Full feature set: age, bmi, hypertension, heart_disease,
    HbA1c_level (optional), blood_glucose_level (optional),
    gender, smoking_history.
    Missing optional fields filled with training medians.
    """
    required = [
        "age", "hypertension", "heart_disease", "bmi",
        "gender", "smoking_history"
    ]
    optional = ["HbA1c_level", "blood_glucose_level"]

    missing = [f for f in required if f not in data]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    medians = _premium_medians.get("diabetes", {})

    row = {k: data[k] for k in required}
    for feat in optional:
        if feat in data and data[feat] not in (None, ""):
            row[feat] = float(data[feat])
        else:
            # Use training median — typical healthy population value
            row[feat] = medians.get(feat, 5.5 if feat == "HbA1c_level" else 100.0)

    df = pd.DataFrame([row])
    df = pd.get_dummies(df, columns=["gender", "smoking_history"])

    columns = _premium_columns["diabetes"]
    for col in columns:
        if col not in df.columns:
            df[col] = 0
    df = df[columns]

    return _premium_scalers["diabetes"].transform(df)


def preprocess_heart_premium(data):
    """
    Progressive enhancement:
      Required: age, sex, cp, trestbps, exang
      Optional: chol, restecg, thalach, oldpeak, slope, ca, thal
    Missing optional features filled with medians + indicator = 0
    """
    required = ["age", "sex", "cp", "trestbps", "exang"]
    missing  = [f for f in required if f not in data]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    medians          = _premium_medians["heart"]
    columns          = _premium_columns["heart"]
    optional_originals = ["chol", "restecg", "thalach", "oldpeak", "slope", "ca", "thal"]
    categorical_feats  = ["cp", "restecg", "slope", "thal"]

    # Start with required non-categorical fields
    row = {k: float(data[k]) for k in required if k not in categorical_feats}
    row["cp"] = int(data["cp"])   # cp is required + categorical

    # Handle each optional feature
    for feat in optional_originals:
        provided = feat in data and data[feat] is not None
        ind_col  = feat + "_provided"

        if feat in categorical_feats:
            feat_cols = [c for c in medians if c.startswith(feat + "_")]
            if provided:
                val = int(data[feat])
                for c in feat_cols:
                    suffix = int(c.split("_")[-1])
                    row[c] = 1 if val == suffix else 0
                row[ind_col] = 1
            else:
                for c in feat_cols:
                    row[c] = medians.get(c, 0)
                row[ind_col] = 0
        else:
            row[feat]    = float(data[feat]) if provided else medians.get(feat, 0)
            row[ind_col] = 1 if provided else 0

    df = pd.DataFrame([row])
    df = pd.get_dummies(df, columns=["cp"])

    for col in columns:
        if col not in df.columns:
            df[col] = 0
    df = df[columns]

    return _premium_scalers["heart"].transform(df)


def preprocess_pcos_premium(data):
    """
    Progressive enhancement:
      Required: Age, BMI, Waist, Cycle, Cycle length, symptoms
      Optional: AMH, LH, FSH, Follicle counts, F sizes
    """
    required = [
        "Age (yrs)", "BMI", "Waist(inch)", "Cycle(R/I)",
        "Cycle length(days)", "Weight gain(Y/N)", "hair growth(Y/N)",
        "Skin darkening (Y/N)", "Hair loss(Y/N)", "Pimples(Y/N)", "Fast food (Y/N)"
    ]
    optional = [
        "AMH(ng/mL)", "LH(mIU/mL)", "FSH(mIU/mL)",
        "Follicle No. (L)", "Follicle No. (R)",
        "Avg. F size (L) (mm)", "Avg. F size (R) (mm)"
    ]

    missing = [f for f in required if f not in data]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    medians = _premium_medians["pcos"]
    columns = _premium_columns["pcos"]

    row = {k: float(data[k]) for k in required}

    for feat in optional:
        provided     = feat in data and data[feat] is not None
        row[feat]    = float(data[feat]) if provided else medians.get(feat, 0)
        row[feat + "_provided"] = 1 if provided else 0

    df = pd.DataFrame([row])

    for col in columns:
        if col not in df.columns:
            df[col] = 0
    df = df[columns]

    return _premium_scalers["pcos"].transform(df)


def preprocess_stroke_premium(data):
    """
    Features: age, hypertension, heart_disease,
              avg_glucose_level, bmi, smoking_status
    """
    required = [
        "age", "hypertension", "heart_disease",
        "avg_glucose_level", "bmi", "smoking_status"
    ]
    missing = [f for f in required if f not in data]
    if missing:
        raise ValueError(f"Missing fields: {', '.join(missing)}")

    df      = pd.DataFrame([{k: data[k] for k in required}])
    df      = pd.get_dummies(df, columns=["smoking_status"])
    columns = _premium_columns["stroke"]

    for col in columns:
        if col not in df.columns:
            df[col] = 0
    df = df[columns]

    return _premium_scalers["stroke"].transform(df)


# ─── Lite Preprocessor ────────────────────────────────────────────────────────
LITE_REQUIRED = {
    "diabetes": ["age", "bmi", "hypertension", "heart_disease",
                 "smoking_history", "gender"],
    "heart":    ["age", "sex", "cp", "trestbps", "exang"],
    # NOTE: heart lite model was trained with sex=1=Male, sex=0=Female
    # Frontend sends sex=1=Male, sex=0=Female — matches, no flip needed
    # BUT model predicts sex=0 as high risk → training used sex=1=Female convention
    # Fix applied in preprocess_lite below
    "pcos":     ["Age (yrs)", "BMI", "Waist(inch)", "Cycle(R/I)",
                 "Cycle length(days)", "Weight gain(Y/N)", "hair growth(Y/N)",
                 "Skin darkening (Y/N)", "Hair loss(Y/N)", "Pimples(Y/N)",
                 "Fast food (Y/N)"],
    "stroke":   ["age", "hypertension", "heart_disease",
                 "avg_glucose_level", "bmi", "smoking_status"],
}

LITE_CATEGORICALS = {
    "diabetes": ["gender", "smoking_history"],
    "heart":    ["cp"],
    "pcos":     [],
    "stroke":   ["smoking_status"],
}


# Numeric categoricals — frontend sends as floats (e.g. 2.0)
# Must cast to int before get_dummies so columns are cp_2 not cp_2.0
NUMERIC_CATEGORICALS = {"cp", "restecg", "slope", "thal", "Cycle(R/I)"}

def preprocess_lite(disease, data):
    """
    XGBoost free tier — no scaling needed.
    One-hot encode categoricals, align with training columns.
    """
    columns  = _lite_columns[disease]
    cat_cols = LITE_CATEGORICALS[disease]

    df = pd.DataFrame([data])

    if cat_cols:
        for col in cat_cols:
            if col in df.columns:
                if col in NUMERIC_CATEGORICALS:
                    # Cast to int first so get_dummies creates cp_2 not cp_2.0
                    df[col] = df[col].astype(int)
                # String categoricals (gender, smoking_history, smoking_status)
                # are already strings — get_dummies handles them directly

        df = pd.get_dummies(df, columns=cat_cols)

    # Fix boolean columns to float (newer pandas get_dummies returns bool)
    df = df.astype(float)

    for col in columns:
        if col not in df.columns:
            df[col] = 0.0
    df = df[columns]

    return df


# ─── Health Endpoint ──────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# ─── Prediction Route ─────────────────────────────────────────────────────────
@app.route("/predict/<disease>", methods=["POST", "OPTIONS"])
def predict(disease):
    if request.method == "OPTIONS":
        return "", 204

    # ── Auth ──────────────────────────────────────────────────────────────────
    if INTERNAL_SECRET:
        secret = request.headers.get("X-Internal-Secret", "")
        if secret != INTERNAL_SECRET:
            return jsonify({"error": "Unauthorized"}), 401

    # ── Validate disease ──────────────────────────────────────────────────────
    valid_diseases = ["diabetes", "heart", "pcos", "stroke"]
    if disease not in valid_diseases:
        return jsonify({
            "error": f"Invalid disease. Must be one of: {', '.join(valid_diseases)}"
        }), 400

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        is_premium = bool(data.get("isPremium", False))

        # ── Premium (DNN) prediction ──────────────────────────────────────────
        if is_premium:
            if not load_premium(disease):
                return jsonify({
                    "error": f"Premium model unavailable for {disease}. Try again shortly."
                }), 503

            if disease == "diabetes":
                input_data = preprocess_diabetes_premium(data)
            elif disease == "heart":
                input_data = preprocess_heart_premium(data)
            elif disease == "pcos":
                input_data = preprocess_pcos_premium(data)
            elif disease == "stroke":
                input_data = preprocess_stroke_premium(data)

            raw_prob  = float(
                _premium_models[disease].predict(input_data, verbose=0)[0][0]
            )
            # Heart premium model was trained with flipped labels (0=disease, 1=healthy)
            # Invert the probability so HIGH risk inputs give HIGH probability
            prob      = (1.0 - raw_prob) if disease == "heart" else raw_prob
            threshold = _premium_thresholds[disease]

        # ── Free (XGBoost) prediction ─────────────────────────────────────────
        else:
            if not load_lite(disease):
                return jsonify({
                    "error": f"Free tier model unavailable for {disease}. Try again shortly."
                }), 503

            # Validate required lite fields
            required = LITE_REQUIRED[disease]
            missing  = [f for f in required if f not in data]
            if missing:
                return jsonify({
                    "error": f"Missing fields: {', '.join(missing)}"
                }), 400

            input_df  = preprocess_lite(disease, data)
            raw_prob  = float(
                _lite_models[disease].predict_proba(input_df)[0][1]
            )
            # Heart lite model was trained with flipped labels — invert probability
            prob      = (1.0 - raw_prob) if disease == "heart" else raw_prob
            threshold = _lite_thresholds[disease]

        # ── Response ──────────────────────────────────────────────────────────
        return jsonify({
            "disease":     disease,
            "risk":        get_risk_label(prob, threshold),
            "probability": round(prob * 100, 2),
            "tier":        "premium" if is_premium else "free",
            "isBeta":      disease == "stroke",
        }), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    except Exception:
        print(f"[ERROR] /predict/{disease}:\n{traceback.format_exc()}")
        return jsonify({
            "error": "An internal error occurred. Please try again."
        }), 500


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
