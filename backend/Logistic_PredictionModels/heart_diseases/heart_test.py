import json
import pandas as pd
import numpy as np
import joblib
import os

from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

# Load dataset
with open("heart_improved_xgb.json", "r") as file:
    data = json.load(file)

df = pd.DataFrame(data)
X = df.drop("target", axis=1)
y = df["target"]

# Load or fit scaler
scaler_path = "heart_scaler.pkl"
if os.path.exists(scaler_path):
    scaler = joblib.load(scaler_path)
else:
    scaler = MinMaxScaler()
    scaler.fit(X)
    joblib.dump(scaler, scaler_path)

X_scaled = scaler.transform(X)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# Load or train logistic regression
model_path = "logreg_heart_model.pkl"
if os.path.exists(model_path):
    base_model = joblib.load(model_path)
else:
    base_model = LogisticRegression(max_iter=1000, solver='liblinear')
    base_model.fit(X_train, y_train)
    joblib.dump(base_model, model_path)

# 🧪 Calibrate model
calibrated_model_path = "logreg_heart_calibrated.pkl"
if os.path.exists(calibrated_model_path):
    calibrated_model = joblib.load(calibrated_model_path)
else:
    calibrated_model = CalibratedClassifierCV(base_model, method='sigmoid', cv=5)
    calibrated_model.fit(X_train, y_train)
    joblib.dump(calibrated_model, calibrated_model_path)

# 📊 Evaluate
y_pred_probs = calibrated_model.predict_proba(X_test)[:, 1]
y_pred = (y_pred_probs > 0.5).astype("int32")

print(f"✅ Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("📋 Classification Report:\n", classification_report(y_test, y_pred))
print("📊 Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

# 🔮 Predict a sample (e.g., patient with 60-70% prob)
sample_input = np.array([[51, 1, 3, 125, 213, 0, 0, 125, 1, 1.40, 2, 1, 2]])
sample_scaled = scaler.transform(sample_input)
prob = calibrated_model.predict_proba(sample_scaled)[0][1]

print(f"\n🎯Probability: {prob:.4f}")
