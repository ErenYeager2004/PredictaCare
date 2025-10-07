import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import random
import tensorflow as tf
import joblib
import os

from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, f1_score, roc_curve
from imblearn.combine import SMOTETomek
from imblearn.under_sampling import RandomUnderSampler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt

# Set seeds
np.random.seed(42)
random.seed(42)
tf.random.set_seed(42)

# Load CSV
df = pd.read_csv("diabetes_prediction_dataset.csv")

# Drop target column from features
X = df.drop('diabetes', axis=1)
y = df['diabetes']

# One-hot encode categorical features
X = pd.get_dummies(X, columns=['gender', 'smoking_history'])

# Scale numeric features
scaler_path = "diabetes_scaler.pkl"
if os.path.exists(scaler_path):
    scaler = joblib.load(scaler_path)
else:
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler, scaler_path)

X_scaled = scaler.transform(X)

# Resample to handle class imbalance
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

# Model path
model_path = "diabetes_model.h5"

if os.path.exists(model_path):
    model = load_model(model_path)
else:
    # Neural Network
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

    model.compile(optimizer=Adam(learning_rate=0.0005), loss='binary_crossentropy', metrics=['accuracy'])

    history = model.fit(X_train, y_train, epochs=150, batch_size=32, validation_data=(X_test, y_test))
    model.save(model_path)

# Predictions
y_pred_probs = model.predict(X_test, verbose=0)
y_pred = (y_pred_probs > 0.5).astype("int32")

# F1-based threshold optimization
best_f1 = 0
best_threshold = 0.5
fpr, tpr, thresholds = roc_curve(y_test, y_pred_probs)
for t in thresholds:
    y_temp = (y_pred_probs > t).astype("int32")
    f1 = f1_score(y_test, y_temp)
    if f1 > best_f1:
        best_f1 = f1
        best_threshold = t

print(f"Optimal threshold (F1-based): {best_threshold:.2f}")
y_pred = (y_pred_probs > best_threshold).astype("int32")

# Evaluation
print("Classification Report:\n", classification_report(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
print(f"Test Accuracy: {accuracy:.4f}")

# User Input Prediction Function
def get_user_input():
    print("\nEnter health details to predict Diabetes Risk:")
    gender = input("Gender (Male/Female): ")
    age = int(input("Age: "))
    hypertension = int(input("Hypertension (0=No,1=Yes): "))
    heart_disease = int(input("Heart Disease (0=No,1=Yes): "))
    smoking_history = input("Smoking History (never/current/past/former/not current): ")
    bmi = float(input("BMI: "))
    hba1c = float(input("HbA1c Level: "))
    glucose = float(input("Blood Glucose Level: "))

    # Create dataframe
    user_df = pd.DataFrame([{
        'age': age,
        'hypertension': hypertension,
        'heart_disease': heart_disease,
        'bmi': bmi,
        'HbA1c_level': hba1c,
        'blood_glucose_level': glucose,
        'gender': gender,
        'smoking_history': smoking_history
    }])

    # One-hot encode like training
    user_df = pd.get_dummies(user_df)
    # Add missing columns (if user didn’t enter some categories)
    for col in X.columns:
        if col not in user_df.columns:
            user_df[col] = 0
    user_df = user_df[X.columns]  # Ensure same column order
    return user_df

# Get user input
user_input = get_user_input()
user_input_scaled = scaler.transform(user_input)
prediction_prob = model.predict(user_input_scaled, verbose=0)[0][0]

# Categorized output
if prediction_prob > 0.8:
    prediction = "Diabetes Risk: HIGH ⚠️⚠️"
elif prediction_prob > 0.5:
    prediction = "Diabetes Risk: MODERATE ⚠️"
else:
    prediction = "Diabetes Risk: LOW ✅"

print(f"\nPrediction Probability: {prediction_prob:.2f}")
print(f"\n{prediction}")
