"""
PredictaCare — Heart Disease DNN Training
==========================================
Dataset : predictionModel/heart/heart_improved_xgb.json
          1,025 rows | Nearly balanced (499:526) — no SMOTE needed

Feature Strategy — Progressive Enhancement:
  REQUIRED (user fills form themselves — no tests needed):
    age, sex, cp, trestbps, exang

  OPTIONAL (higher accuracy if available):
    chol     → cholesterol blood test
    restecg  → resting ECG
    thalach  → max heart rate from stress test
    oldpeak  → ST depression from ECG
    slope    → ST segment slope from ECG
    ca       → number of blocked vessels (fluoroscopy)
    thal     → thalassemia type (blood test)

  Missingness indicators added for each optional feature:
    e.g. chol_provided = 1 if user gave value, else 0
    Model learns to use/discount values based on whether they were provided.

Cleaning:
  - Dropped fbs (correlation 0.041 — noise)
  - Dropped thal=0 rows (7 rows — invalid value)
  - Dropped ca=4 rows (18 rows — invalid value)
  - cp, restecg, slope, thal one-hot encoded (categorical not ordinal)

No SMOTE needed — dataset is nearly perfectly balanced (492:508)

Run from backend/ directory:
    python predictionModel/heart/train_heart.py

Artifacts saved to:
    predictionModel/h5Model/heart_model.h5
    predictionModel/scalers/heart_scaler.pkl
    predictionModel/scalers/heart_columns.pkl
    predictionModel/scalers/heart_threshold.json
    predictionModel/scalers/heart_medians.json
"""

import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
import random
import matplotlib.pyplot as plt
import tensorflow as tf

# ─── Verify running from backend/ directory ───────────────────────────────────
if not os.path.exists("predictionModel"):
    print("ERROR: Run this script from the backend/ directory:")
    print("   cd backend")
    print("   python predictionModel/heart/train_heart.py")
    sys.exit(1)

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (
    classification_report, confusion_matrix,
    f1_score, roc_auc_score, roc_curve, accuracy_score
)

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

warnings.filterwarnings("ignore")

# ─── Reproducibility ──────────────────────────────────────────────────────────
SEED = 42
np.random.seed(SEED)
random.seed(SEED)
tf.random.set_seed(SEED)

# ─── Paths ────────────────────────────────────────────────────────────────────
DATA_PATH      = "predictionModel/heart/heart_improved_xgb.json"
MODEL_DIR      = "predictionModel/h5Model"
SCALER_DIR     = "predictionModel/scalers"
MODEL_PATH     = "predictionModel/h5Model/heart_model.h5"
SCALER_PATH    = "predictionModel/scalers/heart_scaler.pkl"
COLUMNS_PATH   = "predictionModel/scalers/heart_columns.pkl"
THRESHOLD_PATH = "predictionModel/scalers/heart_threshold.json"
MEDIANS_PATH   = "predictionModel/scalers/heart_medians.json"

os.makedirs(MODEL_DIR,  exist_ok=True)
os.makedirs(SCALER_DIR, exist_ok=True)

PLOTS_DIR = "predictionModel/heart/plots"
os.makedirs(PLOTS_DIR, exist_ok=True)

# ─── Config ───────────────────────────────────────────────────────────────────
TARGET = "target"

# User can answer these without any tests
REQUIRED_FEATURES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "exang",
]

# These need ECG, blood test, or clinical procedure
OPTIONAL_FEATURES = [
    "chol",
    "restecg",
    "thalach",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]

# Categorical — one-hot encoded (order does NOT matter clinically)
CATEGORICAL_FEATURES = ["cp", "restecg", "slope", "thal"]

MIN_RECALL = 0.82   # catch at least 82% of heart disease cases
MASK_RATE  = 0.40   # simulate 40% missingness for optional features


# ─── Utilities ────────────────────────────────────────────────────────────────
def optimize_threshold(y_true, y_prob, min_recall=MIN_RECALL):
    """
    Find highest threshold where recall >= min_recall.
    Missing heart disease is life-threatening.
    Falls back to best F1 if no threshold meets min_recall.
    """
    _, _, thresholds = roc_curve(y_true, y_prob)
    best_f1, best_f1_t = 0.0, 0.5
    best_recall_t = None

    for t in thresholds:
        preds = (y_prob >= t).astype(int)
        f1  = f1_score(y_true, preds, zero_division=0)
        rec = preds[y_true == 1].mean()

        if f1 > best_f1:
            best_f1, best_f1_t = f1, float(t)

        if rec >= min_recall:
            if best_recall_t is None or float(t) > best_recall_t:
                best_recall_t = float(t)

    if best_recall_t is not None:
        print(f"  ✅ Found threshold meeting recall >= {min_recall}: {best_recall_t:.4f}")
        return best_recall_t, best_f1
    else:
        print(f"  ⚠️  No threshold met recall >= {min_recall}, using best F1: {best_f1_t:.4f}")
        return best_f1_t, best_f1


def evaluate(model, X_test, y_test, threshold):
    y_prob = model.predict(X_test, verbose=0).ravel()
    y_pred = (y_prob >= threshold).astype(int)
    print(f"\n{'='*55}")
    print("  HEART DISEASE — Final Evaluation")
    print(f"{'='*55}")
    print(f"  Threshold : {threshold:.4f}")
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  F1 Score  : {f1_score(y_test, y_pred):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_prob):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=["No Disease", "Heart Disease"]))
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    fn_rate = cm[1][0] / (cm[1][0] + cm[1][1]) * 100
    print(f"\n  False Negative Rate (missed heart disease): {fn_rate:.1f}%")


def get_callbacks():
    return [
        EarlyStopping(
            monitor="val_loss", patience=25,
            restore_best_weights=True, verbose=1
        ),
        ReduceLROnPlateau(
            monitor="val_loss", factor=0.5,
            patience=10, min_lr=1e-6, verbose=1
        ),
    ]

def plot_training_history(history):
    # Accuracy Curve
    plt.figure(figsize=(8,5))

    plt.plot(
        history.history['accuracy'],
        label='Training Accuracy'
    )

    plt.plot(
        history.history['val_accuracy'],
        label='Validation Accuracy'
    )

    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")

    plt.title(
        "Heart Disease DNN Training vs Validation Accuracy"
    )

    plt.legend()

    plt.savefig(
        os.path.join(PLOTS_DIR, "accuracy_curve.png"),
        bbox_inches='tight'
    )

    plt.close()

    # Loss Curve
    plt.figure(figsize=(8,5))

    plt.plot(
        history.history['loss'],
        label='Training Loss'
    )

    plt.plot(
        history.history['val_loss'],
        label='Validation Loss'
    )

    plt.xlabel("Epoch")
    plt.ylabel("Loss")

    plt.title(
        "Heart Disease DNN Training vs Validation Loss"
    )

    plt.legend()

    plt.savefig(
        os.path.join(PLOTS_DIR, "loss_curve.png"),
        bbox_inches='tight'
    )

    plt.close()

    print("\n✅ Training graphs saved")


def plot_roc_curve(y_test, y_prob):
    fpr, tpr, _ = roc_curve(y_test, y_prob)

    roc_auc = roc_auc_score(y_test, y_prob)

    plt.figure(figsize=(6,6))

    plt.plot(
        fpr,
        tpr,
        label=f'AUC = {roc_auc:.4f}'
    )

    plt.plot(
        [0,1],
        [0,1],
        linestyle='--'
    )

    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")

    plt.title("Heart Disease ROC Curve")

    plt.legend()

    plt.savefig(
        os.path.join(PLOTS_DIR, "roc_curve.png"),
        bbox_inches='tight'
    )

    plt.close()

    print("✅ ROC curve saved")

# ─── Step 1: Load ─────────────────────────────────────────────────────────────
print("\n🚀 Heart Disease — DNN Training (Cleveland)")
print("=" * 55)

with open(DATA_PATH) as f:
    data = json.load(f)
df = pd.DataFrame(data)

print(f"  Raw dataset shape : {df.shape}")
print(f"  Target dist (raw) : {df[TARGET].value_counts().to_dict()}")

# ─── Step 2: Clean ────────────────────────────────────────────────────────────
print("\n🧹 Cleaning...")

# Drop fbs — correlation 0.041, pure noise
df = df.drop(columns=["fbs"])
print(f"  Dropped 'fbs'     : correlation=0.041, not predictive")

# Drop thal=0 — invalid (original Cleveland has 1/2/3 only)
before = len(df)
df = df[df["thal"] != 0]
print(f"  Dropped thal=0    : {before - len(df)} rows removed")

# Drop ca=4 — invalid (original Cleveland has 0-3 only)
before = len(df)
df = df[df["ca"] != 4]
print(f"  Dropped ca=4      : {before - len(df)} rows removed")

print(f"  Clean shape       : {df.shape}")
print(f"  Target dist       : {df[TARGET].value_counts().to_dict()}")

# ─── Step 3: One-Hot Encode Categoricals ──────────────────────────────────────
# cp, restecg, slope, thal are categorical NOT ordinal
# cp=3 is NOT more chest pain than cp=2 — they are different types
print("\n🔢 One-hot encoding categorical features...")
df_encoded = pd.get_dummies(df, columns=CATEGORICAL_FEATURES)
print(f"  Columns after encoding: {list(df_encoded.columns)}")

# ─── Step 4: Rebuild Feature Lists After Encoding ─────────────────────────────
all_cols = list(df_encoded.columns)

# Required: age, sex, trestbps, exang (non-categorical required features)
req_encoded = [c for c in all_cols
               if c != TARGET and
               any(c == f for f in REQUIRED_FEATURES
                   if f not in CATEGORICAL_FEATURES)]

# cp is required but categorical — add its one-hot columns to required
req_encoded += [c for c in all_cols if c.startswith("cp_")]

# Optional: chol, thalach, oldpeak, ca (non-categorical optional features)
opt_base_encoded = [c for c in all_cols
                    if c != TARGET and
                    c not in req_encoded and
                    any(c == f for f in OPTIONAL_FEATURES
                        if f not in CATEGORICAL_FEATURES)]

# restecg, slope, thal are optional and categorical — add their one-hot columns
opt_cat_encoded = [c for c in all_cols
                   if any(c.startswith(f + "_")
                          for f in CATEGORICAL_FEATURES
                          if f in OPTIONAL_FEATURES)]

opt_encoded = opt_base_encoded + opt_cat_encoded

print(f"\n  Required features ({len(req_encoded)}): {req_encoded}")
print(f"  Optional features ({len(opt_encoded)}): {opt_encoded}")

# ─── Step 5: Save Medians BEFORE Masking ──────────────────────────────────────
print("\n📊 Computing medians for optional features...")
medians = {}
for col in opt_encoded:
    medians[col] = float(df_encoded[col].median())
    print(f"  {col:<25} median={medians[col]:.3f}")

# ─── Step 6: Simulate Missingness ─────────────────────────────────────────────
# Simulate real-world users who don't have ECG/lab results
# Group one-hot columns per original feature — mask entire group together
print(f"\n🎭 Simulating {int(MASK_RATE*100)}% missingness for optional features...")

np.random.seed(SEED)

# Group one-hot columns by their original feature
opt_groups = {}
for orig_feat in OPTIONAL_FEATURES:
    if orig_feat in CATEGORICAL_FEATURES:
        group = [c for c in opt_encoded if c.startswith(orig_feat + "_")]
    else:
        group = [orig_feat] if orig_feat in opt_encoded else []
    if group:
        opt_groups[orig_feat] = group

for orig_feat, group_cols in opt_groups.items():
    mask    = np.random.random(len(df_encoded)) < MASK_RATE
    ind_col = orig_feat + "_provided"
    df_encoded[ind_col] = (~mask).astype(int)
    for col in group_cols:
        df_encoded.loc[mask, col] = medians[col]
    print(f"  {orig_feat:<12} ({len(group_cols)} cols) masked {mask.sum()} rows "
          f"→ '{ind_col}' added")

# ─── Step 7: Build Final Feature Set ──────────────────────────────────────────
indicator_cols = [f + "_provided" for f in opt_groups.keys()]
ALL_FEATURES   = req_encoded + opt_encoded + indicator_cols

X = df_encoded[ALL_FEATURES].copy()
y = df_encoded[TARGET].astype(int)

print(f"\n  Total input features : {len(ALL_FEATURES)}")
print(f"    Required           : {len(req_encoded)}")
print(f"    Optional           : {len(opt_encoded)}")
print(f"    Indicators         : {len(indicator_cols)}")
print(f"  Class balance        : {dict(pd.Series(y).value_counts())}")

# ─── Step 8: Train/Test Split ─────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=SEED, stratify=y
)
print(f"\n  Train size : {X_train.shape[0]}")
print(f"  Test size  : {X_test.shape[0]}")
print(f"  Train dist : {dict(pd.Series(y_train).value_counts())}")
print(f"  Test dist  : {dict(pd.Series(y_test).value_counts())}")

# ─── Step 9: Scale ────────────────────────────────────────────────────────────
scaler    = MinMaxScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)
columns   = list(X_train.columns)

# ─── Step 10: Build Model ─────────────────────────────────────────────────────
# Balanced dataset — no SMOTE needed
# Small dataset (~1000 rows) — smaller network, heavier regularization
print("\n🏗️  Building DNN...")

n_inputs = X_train_s.shape[1]

model = Sequential([
    Dense(128, activation="relu", kernel_regularizer=l2(0.01),
          input_shape=(n_inputs,)),
    BatchNormalization(),
    Dropout(0.4),

    Dense(64, activation="relu", kernel_regularizer=l2(0.01)),
    BatchNormalization(),
    Dropout(0.3),

    Dense(32, activation="relu", kernel_regularizer=l2(0.01)),
    BatchNormalization(),
    Dropout(0.2),

    Dense(16, activation="relu"),
    Dense(1, activation="sigmoid")
])

model.compile(
    optimizer=Adam(learning_rate=0.0005),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        tf.keras.metrics.AUC(name="auc"),
        tf.keras.metrics.Precision(name="precision"),
        tf.keras.metrics.Recall(name="recall")
    ]
)

model.summary()

# ─── Step 11: Train ───────────────────────────────────────────────────────────
# No class_weight needed — dataset is balanced
print("\n🏋️  Training...")
history = model.fit(
    X_train_s, y_train,
    validation_data=(X_test_s, y_test),
    epochs=300,
    batch_size=32,
    callbacks=get_callbacks(),
    verbose=1
)
plot_training_history(history)

# ─── Step 12: Threshold Optimisation ─────────────────────────────────────────
print("\n🎯 Optimizing classification threshold...")
y_prob    = model.predict(X_test_s, verbose=0).ravel()
plot_roc_curve(y_test, y_prob)
threshold, best_f1 = optimize_threshold(y_test, y_prob)
print(f"  Optimal threshold : {threshold:.4f}")
print(f"  Default threshold : 0.5000  "
      f"(F1={f1_score(y_test, (y_prob>=0.5).astype(int)):.4f})")

# ─── Step 13: Save Artifacts ──────────────────────────────────────────────────
print("\n💾 Saving artifacts...")
model.save(MODEL_PATH)
joblib.dump(scaler,  SCALER_PATH)
joblib.dump(columns, COLUMNS_PATH)
with open(THRESHOLD_PATH, "w") as f:
    json.dump({"threshold": threshold}, f)
with open(MEDIANS_PATH, "w") as f:
    json.dump(medians, f)

print(f"  ✅ Model     → {MODEL_PATH}")
print(f"  ✅ Scaler    → {SCALER_PATH}")
print(f"  ✅ Columns   → {COLUMNS_PATH}")
print(f"  ✅ Threshold → {THRESHOLD_PATH}")
print(f"  ✅ Medians   → {MEDIANS_PATH}")

# ─── Step 14: Final Evaluation ────────────────────────────────────────────────
evaluate(model, X_test_s, y_test, threshold)

# ─── Step 15: Accuracy by Data Completeness ───────────────────────────────────
print("\n📊 Accuracy by data completeness...")

y_prob_full = model.predict(X_test_s, verbose=0).ravel()
auc_full    = roc_auc_score(y_test, y_prob_full)

# Simulate no optional features provided
X_test_none = X_test.copy()
for col in opt_encoded:
    X_test_none[col] = medians[col]
for ind in indicator_cols:
    X_test_none[ind] = 0
X_test_none_s = scaler.transform(X_test_none)
auc_none      = roc_auc_score(y_test,
                model.predict(X_test_none_s, verbose=0).ravel())

# Simulate blood test only (chol + thal provided)
X_test_blood = X_test.copy()
blood_feats  = ["chol", "thal"]
for ind in indicator_cols:
    orig = ind.replace("_provided", "")
    X_test_blood[ind] = 1 if orig in blood_feats else 0
for orig_feat, group_cols in opt_groups.items():
    if orig_feat not in blood_feats:
        for col in group_cols:
            X_test_blood[col] = medians[col]
X_test_blood_s = scaler.transform(X_test_blood)
auc_blood      = roc_auc_score(y_test,
                 model.predict(X_test_blood_s, verbose=0).ravel())

print(f"\n  Basic info only (age, sex, chest pain, BP, angina) : ROC-AUC = {auc_none:.4f}")
print(f"  + Blood tests (cholesterol + thal)                 : ROC-AUC = {auc_blood:.4f}")
print(f"  + All tests (ECG + blood + fluoroscopy)            : ROC-AUC = {auc_full:.4f}")
print(f"\n  Improvement from blood tests : +{(auc_blood-auc_none)*100:.1f}%")
print(f"  Improvement from all data    : +{(auc_full-auc_none)*100:.1f}%")

print("\n✅ Heart disease model training complete.")
print("   Use heart_medians.json at inference for missing optional values.")
print("   Set <feature>_provided = 0 for any optional value not entered.")
