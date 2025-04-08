import json
import numpy as np
import pandas as pd
import random
import tensorflow as tf
import joblib
import os

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, confusion_matrix, f1_score, roc_curve

from imblearn.combine import SMOTETomek
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.regularizers import l2

# Reproducibility
np.random.seed(42)
random.seed(42)
tf.random.set_seed(42)

# === Load and Prepare Dataset ===
with open('pcos_final_dataset_fixed.json', 'r') as file:
    data = json.load(file)

df = pd.DataFrame(data)

selected_features = [
    'Age (yrs)', 'BMI', 'AMH(ng/mL)', 'LH(mIU/mL)', 'FSH(mIU/mL)', 'FSH/LH',
    'Cycle length(days)', 'Cycle(R/I)', 'Weight gain(Y/N)', 'hair growth(Y/N)',
    'Skin darkening (Y/N)', 'Hair loss(Y/N)', 'Pimples(Y/N)', 'Follicle No. (L)',
    'Follicle No. (R)', 'Avg. F size (L) (mm)', 'Avg. F size (R) (mm)',
    'TSH (mIU/L)', 'Endometrium (mm)', 'PRL(ng/mL)'
]

X = df[selected_features]
y = df['PCOS (Y/N)']

# === Scaling ===
scaler_path = "pcos_scalerv5.pkl"
if os.path.exists(scaler_path):
    scaler = joblib.load(scaler_path)
else:
    scaler = MinMaxScaler()
    scaler.fit(X)
    joblib.dump(scaler, scaler_path)

X_scaled = scaler.transform(X)

# === Resample Data ===
data_path = "pcos_processed_data.npz"
if os.path.exists(data_path):
    loaded = np.load(data_path)
    X_final, y_final = loaded['X_final'], loaded['y_final']
else:
    smt = SMOTETomek(random_state=42)
    X_final, y_final = smt.fit_resample(X_scaled, y)
    np.savez(data_path, X_final=X_final, y_final=y_final)

# === Train-Test Split ===
X_train, X_test, y_train, y_test = train_test_split(X_final, y_final, test_size=0.2, random_state=42)

# === Model ===
model_path = "pcos_modelV2.h5"

if os.path.exists(model_path):
    model = load_model(model_path)
else:
    model = Sequential([
        Dense(256, activation='relu', input_shape=(X_train.shape[1],), kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dropout(0.4),
        Dense(128, activation='relu', kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dropout(0.3),
        Dense(64, activation='relu'),
        Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer=Adam(learning_rate=0.0004),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)

    history = model.fit(
        X_train, y_train,
        epochs=200,
        batch_size=32,
        validation_data=(X_test, y_test),
        callbacks=[early_stop],
        verbose=1
    )

    model.save(model_path)

# === Threshold Optimization ===
y_probs = model.predict(X_test, verbose=0)
best_f1 = 0
best_threshold = 0.5
fpr, tpr, thresholds = roc_curve(y_test, y_probs)
for t in thresholds:
    preds = (y_probs > t).astype("int32")
    f1 = f1_score(y_test, preds)
    if f1 > best_f1:
        best_f1 = f1
        best_threshold = t

print(f"✅ Optimal threshold (F1): {best_threshold:.2f}")

# === Evaluation ===
final_preds = (y_probs > best_threshold).astype("int32")
print("📊 Classification Report:\n", classification_report(y_test, final_preds))
print("📉 Confusion Matrix:\n", confusion_matrix(y_test, final_preds))
loss, acc = model.evaluate(X_test, y_test, verbose=0)
print(f"✅ Final Test Accuracy: {acc:.4f}")
