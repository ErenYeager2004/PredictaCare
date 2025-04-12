import json
import joblib
import numpy as np
import pandas as pd
import os
import random

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, roc_curve, f1_score, accuracy_score
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import MinMaxScaler
from imblearn.under_sampling import RandomUnderSampler
from imblearn.combine import SMOTETomek

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

# Load JSON dataset
with open('diabetis_cleaned_xgb.json', 'r') as file:
    data = json.load(file)

df = pd.DataFrame(data)
X = df.drop('Outcome', axis=1)
y = df['Outcome']

# 🔹 Scale Features
scaler_path = "diabetes_scaler.pkl"
if os.path.exists(scaler_path):
    scaler = joblib.load(scaler_path)
else:
    scaler = MinMaxScaler()
    scaler.fit(X)
    joblib.dump(scaler, scaler_path)

X_scaled = scaler.transform(X)

# 🔸 Handle Class Imbalance
data_path = "processed_logreg_data.npz"
if os.path.exists(data_path):
    loaded_data = np.load(data_path)
    X_final, y_final = loaded_data['X_final'], loaded_data['y_final']
else:
    rus = RandomUnderSampler(random_state=42)
    X_rus, y_rus = rus.fit_resample(X_scaled, y)
    smt = SMOTETomek(random_state=42)
    X_final, y_final = smt.fit_resample(X_rus, y_rus)
    np.savez(data_path, X_final=X_final, y_final=y_final)

# 🧪 Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X_final, y_final, test_size=0.2, random_state=42)

# 🧠 Train Logistic Regression with Grid Search
model_path = "logreg_diabetes_model.pkl"
if os.path.exists(model_path):
    model = joblib.load(model_path)
else:
    param_grid = {
        'C': [0.1, 1, 10],
        'solver': ['liblinear', 'lbfgs'],
        'penalty': ['l2']
    }
    grid = GridSearchCV(LogisticRegression(max_iter=1000), param_grid, cv=5, scoring='f1', n_jobs=-1)
    grid.fit(X_train, y_train)
    model = grid.best_estimator_
    joblib.dump(model, model_path)

# 🎯 Predictions
y_pred_probs = model.predict_proba(X_test)[:, 1]

# 🔍 Find Optimal Threshold (F1-score based)
best_f1 = 0
best_threshold = 0.5
fpr, tpr, thresholds = roc_curve(y_test, y_pred_probs)
for t in thresholds:
    y_temp = (y_pred_probs > t).astype("int32")
    score = f1_score(y_test, y_temp)
    if score > best_f1:
        best_f1 = score
        best_threshold = t

# Final predictions using best threshold
y_pred = (y_pred_probs > best_threshold).astype("int32")

# 📊 Evaluation
print(f"🔧 Optimal Threshold (F1): {best_threshold:.4f}")
print(f"✅ Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("📋 Classification Report:\n", classification_report(y_test, y_pred))
print("📊 Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

# 🟦 USER INPUT FUNCTION 🟦
def get_user_input():
    print("\nEnter health details to predict Diabetes Risk:")
    pregnancies = int(input("Number of Pregnancies: "))
    glucose = float(input("Glucose Level: "))
    blood_pressure = float(input("Blood Pressure: "))
    skin_thickness = float(input("Skin Thickness: "))
    insulin = float(input("Insulin Level: "))
    bmi = float(input("BMI: "))
    dpf = float(input("Diabetes Pedigree Function: "))
    age = int(input("Age: "))
    return np.array([[pregnancies, glucose, blood_pressure, skin_thickness, insulin, bmi, dpf, age]])

# 📈 Predict risk from user input
user_input = get_user_input()
user_input_scaled = scaler.transform(user_input)
probability = model.predict_proba(user_input_scaled)[0][1]

if probability > 0.80:
    result = "Diabetes Risk: HIGH ⚠️⚠️"
elif probability > 0.50:
    result = "Diabetes Risk: MODERATE ⚠️"
else:
    result = "Diabetes Risk: LOW ✅"

print(f"\nPrediction Probability: {probability:.2f}")
print(result)
