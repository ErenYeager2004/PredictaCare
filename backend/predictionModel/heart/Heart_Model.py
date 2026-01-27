import os
import json
import time
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, accuracy_score
from sklearn.utils.class_weight import compute_class_weight
from tensorflow import keras
import joblib

# ---------------------- CONFIG ---------------------- #
DATA_URL = "https://customer-assets.emergentagent.com/job_healthpulse-53/artifacts/pgslzhlr_heart_2020_cleaned.csv"
ARTIFACT_DIR = Path("models")
MODEL_PATH = ARTIFACT_DIR / "heart_dnn.h5"
PREPROCESSOR_PATH = ARTIFACT_DIR / "preprocessor.joblib"
THRESHOLD_PATH = ARTIFACT_DIR / "threshold.json"

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

# ---------------------- TRAINING ---------------------- #
def load_data():
    df = pd.read_csv(DATA_URL)
    df["HeartDisease"] = (df["HeartDisease"].astype(str).str.strip().str.lower() == "yes").astype(int)
    return df

def build_pipeline(df):
    numeric_cols = ["BMI", "PhysicalHealth", "MentalHealth", "SleepTime"]
    categorical_cols = [c for c in df.columns if c not in numeric_cols + ["HeartDisease"]]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
        ]
    )
    return preprocessor

def make_model(input_dim, lr=5e-4, dropout=0.35):
    inputs = keras.Input(shape=(input_dim,))
    x = keras.layers.Dense(256, activation="relu")(inputs)
    x = keras.layers.Dropout(dropout)(x)
    x = keras.layers.Dense(128, activation="relu")(x)
    x = keras.layers.Dropout(dropout)(x)
    x = keras.layers.Dense(64, activation="relu")(x)
    x = keras.layers.Dropout(dropout)(x)
    outputs = keras.layers.Dense(1, activation="sigmoid")(x)

    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=lr),
        loss="binary_crossentropy",
        metrics=["accuracy", keras.metrics.AUC(name="auc")]
    )
    return model

def tune_threshold(y_true, y_prob):
    best_t, best_f1 = 0.5, -1
    for t in np.linspace(0.1, 0.9, 81):
        f1 = f1_score(y_true, (y_prob >= t).astype(int))
        if f1 > best_f1:
            best_f1, best_t = f1, t
    return float(best_t)

def train_if_needed():
    if MODEL_PATH.exists() and PREPROCESSOR_PATH.exists() and THRESHOLD_PATH.exists():
        print("✅ Model artifacts found — skipping training.")
        return

    print("🚀 Training new heart disease prediction model...")
    df = load_data()
    X, y = df.drop(columns=["HeartDisease"]), df["HeartDisease"]
    preprocessor = build_pipeline(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    X_train_enc = preprocessor.fit_transform(X_train)
    X_test_enc = preprocessor.transform(X_test)

    model = make_model(X_train_enc.shape[1])
    model.fit(X_train_enc, y_train, validation_data=(X_test_enc, y_test), epochs=25, batch_size=1024, verbose=2)

    y_prob = model.predict(X_test_enc).ravel()
    threshold = tune_threshold(y_test, y_prob)

    model.save(MODEL_PATH)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    with open(THRESHOLD_PATH, "w") as f:
        json.dump({"threshold": threshold}, f)

    print(f"✅ Training complete. Optimal threshold = {threshold:.3f}")

# ---------------------- INFERENCE ---------------------- #
def load_bundle():
    print("📦 Loading model and preprocessor...")
    model = keras.models.load_model(MODEL_PATH)
    preprocessor = joblib.load(PREPROCESSOR_PATH)
    with open(THRESHOLD_PATH) as f:
        threshold = float(json.load(f).get("threshold", 0.5))
    return model, preprocessor, threshold

def get_user_input():
    print("\n🩺 Please enter patient details for prediction:\n")
    data = {}
    data["BMI"] = float(input("BMI (e.g., 26.5): "))
    data["Smoking"] = input("Do you smoke? (yes/no): ").strip().lower() == "yes"
    data["AlcoholDrinking"] = input("Do you drink alcohol? (yes/no): ").strip().lower() == "yes"
    data["Stroke"] = input("Have you had a stroke? (yes/no): ").strip().lower() == "yes"
    data["PhysicalHealth"] = float(input("Physical Health (0–30 days): "))
    data["MentalHealth"] = float(input("Mental Health (0–30 days): "))
    data["DiffWalking"] = input("Difficulty walking? (yes/no): ").strip().lower() == "yes"
    data["Sex"] = input("Sex (Male/Female): ").strip()
    data["AgeCategory"] = input("Age Category (e.g., 25-29, 50-54): ").strip()
    data["Race"] = input("Race (e.g., White, Black, Asian): ").strip()
    data["Diabetic"] = input("Diabetic? (Yes/No): ").strip()
    data["PhysicalActivity"] = input("Physical activity? (yes/no): ").strip().lower() == "yes"
    data["GenHealth"] = input("General Health (Excellent/Good/Fair/Poor): ").strip()
    data["SleepTime"] = float(input("Average sleep time (hours): "))
    data["Asthma"] = input("Asthma? (yes/no): ").strip().lower() == "yes"
    data["KidneyDisease"] = input("Kidney disease? (yes/no): ").strip().lower() == "yes"
    data["SkinCancer"] = input("Skin cancer? (yes/no): ").strip().lower() == "yes"
    return data

def predict(model, preprocessor, threshold, payload):
    X = pd.DataFrame([payload])
    # Convert booleans to categorical form consistent with training data
    for k in ["Smoking", "AlcoholDrinking", "Stroke", "DiffWalking",
              "PhysicalActivity", "Asthma", "KidneyDisease", "SkinCancer"]:
        X[k] = X[k].apply(lambda v: "Yes" if v else "No")

    X_enc = preprocessor.transform(X)
    prob = float(model.predict(X_enc, verbose=0).ravel()[0])
    label = int(prob >= threshold)

    print("\n🧾 Prediction Result:")
    print(f" - Probability: {prob:.4f}")
    print(f" - Threshold: {threshold:.4f}")
    print(f" - Predicted Label: {'❤️ Heart Disease Risk' if label == 1 else '💚 No Significant Risk'}")

# ---------------------- MAIN ---------------------- #
if __name__ == "__main__":
    train_if_needed()
    model, preprocessor, threshold = load_bundle()
    user_data = get_user_input()
    predict(model, preprocessor, threshold, user_data)
