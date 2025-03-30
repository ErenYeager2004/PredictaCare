import json
import joblib
import numpy as np
import pandas as pd
import random
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_curve, f1_score
from imblearn.combine import SMOTETomek
from imblearn.under_sampling import RandomUnderSampler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt
import os

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)
tf.random.set_seed(42)

# Load JSON dataset
with open('diabetis_cleaned_xgb.json', 'r') as file:
    data = json.load(file)

# Convert to DataFrame
df = pd.DataFrame(data)

# Features & Target
X = df.drop('Outcome', axis=1)
y = df['Outcome']

# Normalize features using MinMaxScaler
scaler_path = "diabetes_scaler.pkl"
if os.path.exists(scaler_path):
    scaler = joblib.load(scaler_path)
else:
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler, scaler_path)

X_scaled = scaler.transform(X)

# Avoid resampling every run by saving the processed dataset
data_path = "processed_data.npz"
if os.path.exists(data_path):
    loaded_data = np.load(data_path)
    X_final, y_final = loaded_data['X_final'], loaded_data['y_final']
else:
    rus = RandomUnderSampler(random_state=42)
    X_resampled, y_resampled = rus.fit_resample(X_scaled, y)
    smt = SMOTETomek(random_state=42)
    X_final, y_final = smt.fit_resample(X_resampled, y_resampled)
    np.savez(data_path, X_final=X_final, y_final=y_final)

# Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X_final, y_final, test_size=0.2, random_state=42)

# Model Path
model_path = "diabetes_model.h5"

if os.path.exists(model_path):
    model = load_model(model_path)
else:
    # Build Neural Network with batch normalization and optimized architecture
    model = Sequential([
        Dense(256, activation='relu', kernel_regularizer=l2(0.001), input_shape=(X_train.shape[1],)),
        BatchNormalization(),
        Dropout(0.4),
        Dense(128, activation='relu', kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dropout(0.3),
        Dense(64, activation='relu'),
        Dense(1, activation='sigmoid')
    ])

    # Compile the model with adjusted learning rate
    model.compile(optimizer=Adam(learning_rate=0.0005), loss='binary_crossentropy', metrics=['accuracy'])

    # Train the model
    history = model.fit(X_train, y_train, epochs=150, batch_size=32, validation_data=(X_test, y_test))

    # Save trained model
    model.save(model_path)

# Predictions and evaluation
y_pred_probs = model.predict(X_test, verbose=0)
y_pred = (y_pred_probs > 0.5).astype("int32")

# Optimize decision threshold using F1-score
best_f1 = 0
best_threshold = 0.5
fpr, tpr, thresholds = roc_curve(y_test, y_pred_probs)
for t in thresholds:
    y_pred_temp = (y_pred_probs > t).astype("int32")
    f1 = f1_score(y_test, y_pred_temp)
    if f1 > best_f1:
        best_f1 = f1
        best_threshold = t

print(f"Optimal threshold (F1-based): {best_threshold}")
y_pred = (y_pred_probs > best_threshold).astype("int32")

# Evaluation metrics
print("Classification Report:\n", classification_report(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

# Test Accuracy
loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
print(f"Test Accuracy: {accuracy:.4f}")

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

# Predict diabetes risk
user_input = get_user_input()
user_input_scaled = scaler.transform(user_input)  # Use saved scaler
prediction_prob = model.predict(user_input_scaled, verbose=0)[0][0]

# Categorized Prediction Output
if prediction_prob > 0.80:  # Adjust this threshold as needed
    prediction = "Diabetes Risk: HIGH ⚠️⚠️"
elif prediction_prob > 0.50:
    prediction = "Diabetes Risk: MODERATE ⚠️"
else:
    prediction = "Diabetes Risk: LOW ✅"

# Display the result
print(f"\nPrediction Probability: {prediction_prob:.2f}")
print(f"\n{prediction}")
