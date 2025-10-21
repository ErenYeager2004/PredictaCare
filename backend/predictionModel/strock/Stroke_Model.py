import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import random
import tensorflow as tf
import joblib
import os
import matplotlib.pyplot as plt
import pickle

from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, f1_score, roc_curve
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras.callbacks import EarlyStopping

# =========================
# SETUP
# =========================
np.random.seed(42)
random.seed(42)
tf.random.set_seed(42)

# =========================
# FILE PATHS
# =========================
DATA_PATH = "stroke_risk_balanced.csv"
SCALER_PATH = "stroke_scaler.pkl"
MODEL_PATH = "stroke_model_classweight.h5"
HISTORY_PATH = "stroke_history.pkl"

# =========================
# LOAD DATA
# =========================
df = pd.read_csv(DATA_PATH)

print("\n🔍 Dataset Info:")
print(df.info())

# =========================
# FEATURE CLEANING
# =========================
TARGET_COL = 'At Risk (Binary)'

cols_to_remove = [
    "Pain in Neck/Jaw/Shoulder/Back",
    "Snoring/Sleep Apnea",
    "Stroke Risk (%)"
]
df = df.drop(columns=[col for col in cols_to_remove if col in df.columns], errors='ignore')

print(f"\n✅ Removed unwanted features: {cols_to_remove}")
print(f"📊 Remaining columns after cleaning: {list(df.columns)}")

# =========================
# FEATURE / TARGET SPLIT
# =========================
X = df.drop(TARGET_COL, axis=1)
y = df[TARGET_COL]

# One-hot encode categorical variables
X = pd.get_dummies(X, drop_first=True)

# =========================
# SCALING
# =========================
if os.path.exists(SCALER_PATH):
    scaler = joblib.load(SCALER_PATH)
    print(f"\n💾 Loaded existing scaler from '{SCALER_PATH}'")
else:
    scaler = MinMaxScaler()
    scaler.fit(X)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\n💾 Scaler saved to '{SCALER_PATH}'")

X_scaled = scaler.transform(X)

# =========================
# TRAIN / TEST SPLIT
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# =========================
# CLASS WEIGHTS
# =========================
class_weights = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(y_train),
    y=y_train
)
class_weight_dict = dict(enumerate(class_weights))
print(f"\n⚖️ Computed class weights: {class_weight_dict}")

# =========================
# MODEL TRAINING / LOADING
# =========================
history = None  # Initialize history

if os.path.exists(MODEL_PATH):
    print(f"\n✅ Existing model found at '{MODEL_PATH}'. Loading model...")
    model = load_model(MODEL_PATH)
    # Try to load history if exists
    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH, "rb") as f:
            history = pickle.load(f)
        print("📊 Loaded previous training history for plotting.")
else:
    print("\n🚀 No existing model found. Training a new one...")

    model = Sequential([
        Dense(512, activation='relu', kernel_regularizer=l2(0.001), input_shape=(X_train.shape[1],)),
        BatchNormalization(),
        Dropout(0.4),

        Dense(256, activation='relu', kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dropout(0.3),

        Dense(128, activation='relu', kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dropout(0.3),

        Dense(64, activation='relu'),
        Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer=Adam(learning_rate=0.0003),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    EPOCHS = 100
    BATCH_SIZE = 32

    # EarlyStopping to prevent overfitting
    es = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

    history_obj = model.fit(
        X_train, y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        class_weight=class_weight_dict,
        callbacks=[es],
        verbose=1
    )

    history = history_obj.history  # Save history

    # Save model and history
    model.save(MODEL_PATH)
    with open(HISTORY_PATH, "wb") as f:
        pickle.dump(history, f)
    print(f"\n💾 Model saved as '{MODEL_PATH}' and history saved as '{HISTORY_PATH}'")

# =========================
# MODEL EVALUATION
# =========================
y_pred_probs = model.predict(X_test, verbose=0)

# Find best F1 threshold
best_f1, best_thresh = 0, 0.5
fpr, tpr, thresholds = roc_curve(y_test, y_pred_probs)
for t in thresholds:
    y_temp = (y_pred_probs > t).astype("int32")
    f1 = f1_score(y_test, y_temp)
    if f1 > best_f1:
        best_f1, best_thresh = f1, t

y_pred = (y_pred_probs > best_thresh).astype("int32")

print(f"\n🏆 Optimal Threshold (F1-based): {best_thresh:.3f}")
print("\n📄 Classification Report:\n", classification_report(y_test, y_pred))
print("\n🧩 Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
print(f"\n✅ Test Accuracy: {accuracy:.4f}")

# =========================
# PLOT TRAINING HISTORY
# =========================
if history is not None:
    plt.figure(figsize=(12,5))

    # Loss
    plt.subplot(1,2,1)
    plt.plot(history['loss'], label='Train Loss')
    plt.plot(history['val_loss'], label='Val Loss')
    plt.title('Loss over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()

    # Accuracy
    plt.subplot(1,2,2)
    plt.plot(history['accuracy'], label='Train Acc')
    plt.plot(history['val_accuracy'], label='Val Acc')
    plt.title('Accuracy over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()

    plt.show()
else:
    print("\n⚠️ No training history available for plotting (model loaded from file).")
