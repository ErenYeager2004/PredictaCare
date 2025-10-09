import os
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
import joblib

app = Flask(__name__)

# ------------------- CORS -------------------
CORS(app, resources={
    r"/predict/*": {
        "origins": [
            "https://predictacare-1.onrender.com",
            "http://localhost:5173"
        ]
    }
})

# ------------------- Paths -------------------
MODEL_DIR = "predictionModel/h5Model/"
SCALER_DIR = "predictionModel/scalers/"
LOGISTIC_MODEL_DIR = "Logistic_PredictionModels/models/"
LOGISTIC_SCALER_DIR = "Logistic_PredictionModels/scalers/"

MODEL_FILES = {
    "heart": "heart_disease_model_v2.h5",
    "diabetes": "diabetes_model.h5",
    "stroke": "stroke_model.h5",
    "pcos": "pcos_modelV2.h5"
}

SCALER_FILES = {
    "heart": "scaler.pkl",
    "diabetes": "diabetes_scaler.pkl",
    "stroke": "stroke_scaler.pkl",
    "pcos": "pcos_scalerv5.pkl"
}

LOGISTIC_MODEL_FILES = {
    "heart": "logreg_heart_calibrated.pkl",
    "diabetes": "logreg_diabetes_model.pkl"
}

LOGISTIC_SCALER_FILES = {
    "heart": "heart_scaler.pkl",
    "diabetes": "diabetes_scaler.pkl"
}

DISEASE_FIELDS = {
    "heart": ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
              "thalach", "exang", "oldpeak", "slope", "ca", "thal"],
    "diabetes": ["age", "hypertension", "heart_disease", "bmi",
                 "HbA1c_level", "blood_glucose_level", "gender", "smoking_history"],
    "stroke": ["gender", "age", "hypertension", "heart_disease", "ever_married",
               "work_type", "residence_type", "avg_glucose_level", "bmi", "smoking_status"],
    "pcos": [
        'Age (yrs)', 'BMI', 'AMH(ng/mL)', 'LH(mIU/mL)', 'FSH(mIU/mL)', 'FSH/LH',
        'Cycle length(days)', 'Cycle(R/I)', 'Weight gain(Y/N)', 'hair growth(Y/N)',
        'Skin darkening (Y/N)', 'Hair loss(Y/N)', 'Pimples(Y/N)', 'Follicle No. (L)',
        'Follicle No. (R)', 'Avg. F size (L) (mm)', 'Avg. F size (R) (mm)',
        'TSH (mIU/L)', 'Endometrium (mm)', 'PRL(ng/mL)'
    ]
}

# ------------------- Load models & scalers -------------------
models = {}
scalers = {}
logistic_models = {}
logistic_scalers = {}

# Load Keras models and scalers
for disease, model_file in MODEL_FILES.items():
    model_path = os.path.join(MODEL_DIR, model_file)
    scaler_path = os.path.join(SCALER_DIR, SCALER_FILES[disease])
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        models[disease] = load_model(model_path)
        scalers[disease] = joblib.load(scaler_path)
        print(f"[OK] Loaded model & scaler for {disease}")
    else:
        print(f"❌ Model or scaler missing for {disease}")

# Load logistic models and scalers
for disease, model_file in LOGISTIC_MODEL_FILES.items():
    model_path = os.path.join(LOGISTIC_MODEL_DIR, model_file)
    scaler_path = os.path.join(LOGISTIC_SCALER_DIR, LOGISTIC_SCALER_FILES[disease])
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        logistic_models[disease] = joblib.load(model_path)
        logistic_scalers[disease] = joblib.load(scaler_path)
        print(f"[OK] Loaded logistic model & scaler for {disease}")
    else:
        print(f"❌ Logistic model or scaler missing for {disease}")

# ------------------- Prediction Route -------------------
@app.route("/predict/<disease>", methods=["POST", "OPTIONS"])
def predict(disease):
    if request.method == "OPTIONS":
        return "", 204
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
        if disease not in models:
            return jsonify({"error": "Invalid disease type"}), 400

        # ---------------- Diabetes Handling ----------------
        if disease == "diabetes":
            diabetes_columns_path = os.path.join(SCALER_DIR, "diabetes_columns.pkl")
            if not os.path.exists(diabetes_columns_path):
                return jsonify({"error": "diabetes_columns.pkl not found"}), 500

            diabetes_columns = joblib.load(diabetes_columns_path)

            # Required raw fields
            required_fields = ["age", "hypertension", "heart_disease", "bmi",
                               "HbA1c_level", "blood_glucose_level", "gender", "smoking_history"]
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                return jsonify({"error": f"Missing input fields: {', '.join(missing_fields)}"}), 400

            # One-hot encode and align with scaler
            user_df = pd.DataFrame([data])
            user_df = pd.get_dummies(user_df, columns=["gender", "smoking_history"])
            for col in diabetes_columns:
                if col not in user_df.columns:
                    user_df[col] = 0
            user_df = user_df[diabetes_columns]
            input_scaled = scalers[disease].transform(user_df)

        else:
            missing_fields = [field for field in DISEASE_FIELDS[disease] if field not in data]
            if missing_fields:
                return jsonify({"error": f"Missing input fields: {', '.join(missing_fields)}"}), 400
            features = [float(data[field]) for field in DISEASE_FIELDS[disease]]
            input_scaled = scalers[disease].transform(np.array([features]))

        prediction_prob = models[disease].predict(input_scaled)[0][0]
        prediction = "HIGH ⚠️⚠️" if prediction_prob > 0.8 else \
                     "MODERATE ⚠️" if prediction_prob > 0.5 else "LOW ✅"

        return jsonify({
            "disease": disease,
            "risk": prediction,
            "probability": round(float(prediction_prob) * 100, 2)
        }), 200

    except Exception as e:
        print(f"Server Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ------------------- Logistic Prediction Route -------------------
@app.route("/predict_logistic/<disease>", methods=["POST", "OPTIONS"])
def predict_logistic(disease):
    if request.method == "OPTIONS":
        return "", 204
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
        if disease not in logistic_models:
            return jsonify({"error": "Invalid disease type for logistic prediction"}), 400

        if disease == "diabetes":
            diabetes_columns_path = os.path.join(LOGISTIC_SCALER_DIR, "diabetes_columns.pkl")
            if not os.path.exists(diabetes_columns_path):
                return jsonify({"error": "diabetes_columns.pkl not found"}), 500

            diabetes_columns = joblib.load(diabetes_columns_path)
            required_fields = ["age", "hypertension", "heart_disease", "bmi",
                               "HbA1c_level", "blood_glucose_level", "gender", "smoking_history"]
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                return jsonify({"error": f"Missing input fields: {', '.join(missing_fields)}"}), 400

            user_df = pd.DataFrame([data])
            user_df = pd.get_dummies(user_df, columns=["gender", "smoking_history"])
            for col in diabetes_columns:
                if col not in user_df.columns:
                    user_df[col] = 0
            user_df = user_df[diabetes_columns]
            input_scaled = logistic_scalers[disease].transform(user_df)

        else:
            missing_fields = [field for field in DISEASE_FIELDS[disease] if field not in data]
            if missing_fields:
                return jsonify({"error": f"Missing input fields: {', '.join(missing_fields)}"}), 400
            features = [float(data[field]) for field in DISEASE_FIELDS[disease]]
            input_scaled = logistic_scalers[disease].transform(np.array([features]))

        prediction_prob = logistic_models[disease].predict_proba(input_scaled)[0][1]
        prediction = "HIGH ⚠️⚠️" if prediction_prob > 0.8 else \
                     "MODERATE ⚠️" if prediction_prob > 0.5 else "LOW ✅"

        return jsonify({
            "disease": disease,
            "risk": prediction,
            "probability": round(float(prediction_prob) * 100, 2)
        }), 200

    except Exception as e:
        print(f"Server Error (Logistic): {str(e)}")
        return jsonify({"error": str(e)}), 500

# ------------------- Run Server -------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
