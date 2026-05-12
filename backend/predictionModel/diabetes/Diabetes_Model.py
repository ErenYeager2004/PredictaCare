
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
import random
import tensorflow as tf

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (
    classification_report, confusion_matrix,
    f1_score, roc_auc_score, roc_curve, accuracy_score
)
from imblearn.combine import SMOTETomek
from imblearn.over_sampling import SMOTE

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

#  Reproducibility
SEED = 42
np.random.seed(SEED)
random.seed(SEED)
tf.random.set_seed(SEED)

#  Paths
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

DATA_PATH      = os.path.join(BASE_DIR, "diabetes_prediction_dataset.csv")
MODEL_DIR      = os.path.join(BACKEND_DIR, "predictionModel", "h5Model")
SCALER_DIR     = os.path.join(BACKEND_DIR, "predictionModel", "scalers")
MODEL_PATH     = os.path.join(MODEL_DIR,  "diabetes_model.h5")
SCALER_PATH    = os.path.join(SCALER_DIR, "diabetes_scaler.pkl")
COLUMNS_PATH   = os.path.join(SCALER_DIR, "diabetes_columns.pkl")
THRESHOLD_PATH = os.path.join(SCALER_DIR, "diabetes_threshold.json")

os.makedirs(MODEL_DIR,  exist_ok=True)
os.makedirs(SCALER_DIR, exist_ok=True)
PLOTS_DIR = os.path.join(BASE_DIR, "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)

#  Configuration
TARGET           = "diabetes"
CATEGORICAL_COLS = ["gender", "smoking_history"]
SMOTE_RATIO      = 0.43


#  Utility func
def optimize_threshold(y_true, y_prob, min_recall=0.85):
    """
    Find the highest threshold where recall >= min_recall.
    In medical diagnosis, missing a sick patient (false negative)
    is more dangerous than a false alarm — so we prioritise recall.
    Falls back to best F1 threshold if no threshold meets min_recall.
    """
    _, _, thresholds = roc_curve(y_true, y_prob)

    best_f1, best_f1_t = 0.0, 0.5
    best_recall_t = None

    for t in thresholds:
        preds = (y_prob >= t).astype(int)
        f1  = f1_score(y_true, preds, zero_division=0)
        rec = preds[y_true == 1].mean()  # recall for positive class

        # Track best F1 as fallback
        if f1 > best_f1:
            best_f1, best_f1_t = f1, float(t)

        # Find highest threshold still achieving min_recall
        if rec >= min_recall:
            if best_recall_t is None or float(t) > best_recall_t:
                best_recall_t = float(t)

    if best_recall_t is not None:
        print(f"   Found threshold meeting recall >= {min_recall}: {best_recall_t:.4f}")
        return best_recall_t, best_f1
    else:
        print(f"    No threshold met recall >= {min_recall}, falling back to best F1 threshold")
        return best_f1_t, best_f1


def evaluate(model, X_test, y_test, threshold):
    y_prob = model.predict(X_test, verbose=0).ravel()
    y_pred = (y_prob >= threshold).astype(int)
    print(f"\n{'='*55}")
    print("  DIABETES — Final Evaluation")
    print(f"{'='*55}")
    print(f"  Threshold : {threshold:.4f}")
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  F1 Score  : {f1_score(y_test, y_pred):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_prob):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["No Diabetes", "Diabetes"]))
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    print(f"\n  False Negative Rate (missed diabetics): {cm[1][0]/(cm[1][0]+cm[1][1])*100:.1f}%")


def get_callbacks():
    return [
        EarlyStopping(
            monitor="val_loss", patience=15,
            restore_best_weights=True, verbose=1
        ),
        ReduceLROnPlateau(
            monitor="val_loss", factor=0.5,
            patience=7, min_lr=1e-6, verbose=1
        ),
    ]


#  Step 1: Load
print("\n Diabetes — DNN Training")
print("=" * 55)

df = pd.read_csv(DATA_PATH)
print(f"  Raw dataset shape : {df.shape}")
print(f"  Target dist (raw) : {df[TARGET].value_counts().to_dict()}")

#  Step 2: Clean the dataset
print("\n Cleaning...")

# Remove 'Other' gender — only 18 rows, 0% diabetes rate
before = len(df)
df = df[df["gender"] != "Other"]
print(f"  Removed 'Other' gender : {before - len(df)} rows dropped")

# Remove ages under 1
before = len(df)
df = df[df["age"] >= 1]
print(f"  Removed age < 1        : {before - len(df)} rows dropped")

print(f"  Clean dataset shape    : {df.shape}")
print(f"  Target dist (clean)    : {df[TARGET].value_counts().to_dict()}")

#  Step 3: Features & Target
X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)

#  Step 4: One-Hot Encode
print("\n Encoding categorical columns...")
X_encoded = pd.get_dummies(X, columns=CATEGORICAL_COLS)
columns = list(X_encoded.columns)
print(f"  Encoded columns ({len(columns)}): {columns}")

#  Step 5: Train/Test Split
# Split the dataset before resampling
X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y, test_size=0.2, random_state=SEED, stratify=y
)
print(f"\n  Train size : {X_train.shape[0]}")
print(f"  Test size  : {X_test.shape[0]}")
print(f"  Train dist : {dict(pd.Series(y_train).value_counts())}")
print(f"  Test dist  : {dict(pd.Series(y_test).value_counts())}")

#  Step 6: Scaling the model
scaler = MinMaxScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

#  Step 7: Handle Imbalance
# SMOTETomek — oversample minority + clean noisy borderline samples
# Targeting ~70:30 ratio
print(f"\n  Applying SMOTETomek (target ratio ~70:30)...")
print(f"  Before : {np.bincount(y_train.astype(int))}")

smote = SMOTE(random_state=SEED, sampling_strategy=SMOTE_RATIO)
smt   = SMOTETomek(random_state=SEED, smote=smote)
X_train_res, y_train_res = smt.fit_resample(X_train_s, y_train)

counts = np.bincount(y_train_res.astype(int))
print(f"  After  : {counts}")
print(f"  New ratio : {counts[0]/counts[1]:.1f}:1  ({counts[0]/(counts[0]+counts[1])*100:.0f}%:{counts[1]/(counts[0]+counts[1])*100:.0f}%)")

#  Step 8: Build Model Structure
print("\n  Building DNN...")

model = Sequential([
    Dense(256, activation="relu", kernel_regularizer=l2(0.001),
          input_shape=(X_train_res.shape[1],)),
    BatchNormalization(),
    Dropout(0.4),

    Dense(128, activation="relu", kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Dropout(0.3),

    Dense(64, activation="relu", kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Dropout(0.2),

    Dense(32, activation="relu"),
    Dense(1, activation="sigmoid")
])

model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        tf.keras.metrics.AUC(name="auc"),
        tf.keras.metrics.Precision(name="precision"),
        tf.keras.metrics.Recall(name="recall")
    ]
)

model.summary()

def plot_training_history(history):
    # Accuracy Graph
    plt.figure(figsize=(8,5))

    plt.plot(history.history['accuracy'], label='Training Accuracy')
    plt.plot(history.history['val_accuracy'], label='Validation Accuracy')

    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.title("Training vs Validation Accuracy")
    plt.legend()

    plt.savefig(os.path.join(PLOTS_DIR, "accuracy_curve.png"))
    plt.close()

    # Loss Graph
    plt.figure(figsize=(8,5))

    plt.plot(history.history['loss'], label='Training Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')

    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Training vs Validation Loss")
    plt.legend()

    plt.savefig(os.path.join(PLOTS_DIR, "loss_curve.png"))
    plt.close()


def plot_roc_curve(y_test, y_prob):
    fpr, tpr, _ = roc_curve(y_test, y_prob)

    roc_auc = roc_auc_score(y_test, y_prob)

    plt.figure(figsize=(6,6))

    plt.plot(fpr, tpr, label=f'AUC = {roc_auc:.4f}')
    plt.plot([0,1], [0,1], linestyle='--')

    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve")
    plt.legend()

    plt.savefig(os.path.join(PLOTS_DIR, "roc_curve.png"))
    plt.close()

#  Step 9: Train the model
print("\n  Training...")
history = model.fit(
    X_train_res, y_train_res,
    validation_data=(X_test_s, y_test),
    epochs=100,
    batch_size=256,
    callbacks=get_callbacks(),
    verbose=1
)
plot_training_history(history)

# ─── Step 10: Threshold Optimisation ─────────────────────────────────────────
# Default 0.5 threshold is bad for imbalanced medical data
# We optimize for F1 to balance precision and recall
print("\n🎯 Optimizing classification threshold...")
y_prob = model.predict(X_test_s, verbose=0).ravel()
plot_roc_curve(y_test, y_prob)
threshold, best_f1 = optimize_threshold(y_test, y_prob)
print(f"  Optimal threshold : {threshold:.4f}  (F1={best_f1:.4f})")
print(f"  Default threshold : 0.5000  (F1={f1_score(y_test, (y_prob>=0.5).astype(int)):.4f})")

# ─── Step 11 Save Artifacts ──────────────────────────────────────────────────
print("\n Saving artifacts...")
model.save(MODEL_PATH)
joblib.dump(scaler, SCALER_PATH)
joblib.dump(columns, COLUMNS_PATH)
with open(THRESHOLD_PATH, "w") as f:
    json.dump({"threshold": threshold}, f)

print(f" Model     → {MODEL_PATH}")
print(f" Scaler    → {SCALER_PATH}")
print(f" Columns   → {COLUMNS_PATH}")
print(f" Threshold → {THRESHOLD_PATH}")

# ─── Step 12: Final Evaluation ────────────────────────────────────────────────
evaluate(model, X_test_s, y_test, threshold)

print("\n Diabetes model training complete.")
print("   Note: Pay attention to False Negative Rate —")
print("   missing a diabetic patient is more dangerous than a false alarm.")


