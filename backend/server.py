import os
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
import joblib

app = Flask(__name__)
CORS(app, resources={r"/predict/*": {"origins": "*"}}, supports_credentials=True)

# Define paths for models and scalers
MODEL_DIR = "predictionModel/models/"
SCALER_DIR = "predictionModel/scalers/"

# Model and Scaler file mapping
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

# Define input fields per disease
DISEASE_FIELDS = {
    "heart": ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"],
    "diabetes": ["pregnancies", "glucose", "blood_pressure", "skin_thickness", "insulin", "bmi", "dpf", "age"],
    "stroke": ["gender", "age", "hypertension", "heart_disease", "ever_married", "work_type", "residence_type", "avg_glucose_level", "bmi", "smoking_status"],
    "pcos": [
        "age", "bmi", "amh", "lh", "fsh", "fsh_lh", "cycle_length", "cycle_regularity",
        "weight_gain", "hair_growth", "skin_darkening", "hair_loss", "pimples",
        "follicle_L", "follicle_R", "follicle_size_L", "follicle_size_R",
        "tsh", "endometrium", "prl"
    ]

}

# Load models and scalers
models = {}
scalers = {}

for disease, model_file in MODEL_FILES.items():
    model_path = os.path.join(MODEL_DIR, model_file)
    scaler_path = os.path.join(SCALER_DIR, SCALER_FILES[disease])

    if os.path.exists(model_path) and os.path.exists(scaler_path):
        models[disease] = load_model(model_path)
        scalers[disease] = joblib.load(scaler_path)
        print(f"✅ Loaded model & scaler for {disease}")
    else:
        print(f"❌ Model or scaler missing for {disease}")

@app.after_request
def apply_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.route("/predict/<disease>", methods=["POST", "OPTIONS"])
def predict(disease):
    if request.method == "OPTIONS":
        return "", 204  # Handle preflight CORS request

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        if disease not in models:
            return jsonify({"error": "Invalid disease type"}), 400

        # Validate input data
        missing_fields = [field for field in DISEASE_FIELDS[disease] if field not in data]
        if missing_fields:
            return jsonify({"error": f"Missing input fields: {', '.join(missing_fields)}"}), 400

        # Convert input to numerical values
        try:
            features = [float(data[field]) for field in DISEASE_FIELDS[disease]]
        except ValueError:
            return jsonify({"error": "Invalid input: All values must be numeric"}), 400

        input_data = np.array([features])
        input_scaled = scalers[disease].transform(input_data)

        # Predict using the model
        prediction_prob = models[disease].predict(input_scaled)[0][0]
        prediction = "YES" if prediction_prob > 0.5 else "NO"

        return jsonify({
            "disease": disease,
            "risk": prediction,
            "probability": round(float(prediction_prob) * 100, 2)
        }), 200

    except Exception as e:
        print(f"Server Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
