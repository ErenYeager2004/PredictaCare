import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
import random

if not os.path.exists("predictionModel"):
    print("ERROR: Run this script from the backend/ directory:")
    print("   cd backend")
    print("   python predictionModel/heart/train_heart_lite.py")
    sys.exit(1)
import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix,
    f1_score, roc_auc_score, roc_curve, accuracy_score
)

warnings.filterwarnings("ignore")

SEED = 42
np.random.seed(SEED)
random.seed(SEED)

#  Paths
DATA_PATH      = "predictionModel/heart/heart_improved_xgb.json"
LITE_DIR       = "predictionModel/lite_models"
MODEL_PATH     = "predictionModel/lite_models/heart_lite.pkl"
COLUMNS_PATH   = "predictionModel/lite_models/heart_lite_columns.pkl"
THRESHOLD_PATH = "predictionModel/lite_models/heart_lite_threshold.json"

os.makedirs(LITE_DIR, exist_ok=True)
PLOTS_DIR = "predictionModel/heart/plots"
os.makedirs(PLOTS_DIR, exist_ok=True)

TARGET = "target"

# Self-reported only — user answers these without any tests
FEATURES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "exang",
]

CATEGORICAL_FEATURES = ["cp"]   # cp is categorical (chest pain type)
MIN_RECALL = 0.82


#  Utilities
def optimize_threshold(y_true, y_prob, min_recall=MIN_RECALL):
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
        print(f"   Threshold meeting recall >= {min_recall}: {best_recall_t:.4f}")
        return best_recall_t, best_f1
    print(f"    Falling back to best F1 threshold: {best_f1_t:.4f}")
    return best_f1_t, best_f1


def evaluate(model, X_test, y_test, threshold):
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= threshold).astype(int)
    print(f"\n{'='*55}")
    print("  HEART FREE TIER — Final Evaluation")
    print(f"{'='*55}")
    print(f"  Threshold : {threshold:.4f}")
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  F1 Score  : {f1_score(y_test, y_pred):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_prob):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=["No Disease", "Heart Disease"]))
    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    print(f"\n  False Negative Rate: {cm[1][0]/(cm[1][0]+cm[1][1])*100:.1f}%")


def plot_xgb_training(model):
    results = model.evals_result()

    print("\nAvailable metrics:")
    print(results)

    metric_name = list(results['validation_0'].keys())[0]

    train_metric = results['validation_0'][metric_name]
    val_metric   = results['validation_1'][metric_name]

    plt.figure(figsize=(8,5))

    plt.plot(
        train_metric,
        label=f"Training {metric_name.upper()}"
    )

    plt.plot(
        val_metric,
        label=f"Validation {metric_name.upper()}"
    )

    plt.xlabel("Boosting Round")
    plt.ylabel(metric_name.upper())

    plt.title(
        f"Heart Disease XGBoost Training vs Validation {metric_name.upper()}"
    )

    plt.legend()

    plt.savefig(
        os.path.join(PLOTS_DIR, "xgb_training_curve.png"),
        bbox_inches='tight'
    )

    plt.close()

    print("✅ XGBoost training curve saved")


def plot_roc_curve(y_test, y_prob):
    fpr, tpr, _ = roc_curve(y_test, y_prob)

    roc_auc = roc_auc_score(y_test, y_prob)

    plt.figure(figsize=(6,6))

    plt.plot(
        fpr,
        tpr,
        label=f"AUC = {roc_auc:.4f}"
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


#  Load & Clean
print("\n Heart Disease FREE TIER — XGBoost Training")
print("=" * 55)

with open(DATA_PATH) as f:
    data = json.load(f)
df = pd.DataFrame(data)

print(f"  Raw shape : {df.shape}")

# Same cleaning as premium model
df = df.drop(columns=["fbs"])
df = df[df["thal"] != 0]
df = df[df["ca"]   != 4]
print(f"  Clean shape : {df.shape}")
print(f"  Target dist : {df[TARGET].value_counts().to_dict()}")

#  Features
X = df[FEATURES].copy()
y = df[TARGET].astype(int)

# One-hot encode cp — chest pain type is categorical
X = pd.get_dummies(X, columns=CATEGORICAL_FEATURES)
columns = list(X.columns)
print(f"\n  Features ({len(columns)}): {columns}")

#  Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=SEED, stratify=y
)
print(f"\n  Train: {X_train.shape[0]}  Test: {X_test.shape[0]}")

# Dataset is balanced — scale_pos_weight close to 1.0
counts           = np.bincount(y_train)
scale_pos_weight = counts[0] / counts[1]
print(f"  scale_pos_weight: {scale_pos_weight:.2f}")

#  Train
print("\n  Training XGBoost...")
model = XGBClassifier(
    n_estimators      = 300,
    max_depth         = 5,
    learning_rate     = 0.05,
    subsample         = 0.8,
    colsample_bytree  = 0.8,
    scale_pos_weight  = scale_pos_weight,
    use_label_encoder = False,
    eval_metric       = "auc",
    random_state      = SEED,
    n_jobs            = -1,
)


model.fit(
    X_train,
    y_train,

    eval_set=[
        (X_train, y_train),
        (X_test, y_test)
    ],

    verbose=50,
)

plot_xgb_training(model)

#  Threshold & Save
print("\n Optimizing threshold...")
y_prob    = model.predict_proba(X_test)[:, 1]
plot_roc_curve(y_test, y_prob)
threshold, _ = optimize_threshold(y_test, y_prob)

print("\n Saving artifacts...")
joblib.dump(model,   MODEL_PATH)
joblib.dump(columns, COLUMNS_PATH)
with open(THRESHOLD_PATH, "w") as f:
    json.dump({"threshold": threshold}, f)

print(f"   Model     → {MODEL_PATH}")
print(f"   Columns   → {COLUMNS_PATH}")
print(f"   Threshold → {THRESHOLD_PATH}")

evaluate(model, X_test, y_test, threshold)

print("\n Feature Importance:")
importance = pd.Series(model.feature_importances_, index=columns)
for feat, imp in importance.sort_values(ascending=False).items():
    print(f"  {feat:<20} {imp:.4f}")

print("\n Heart free tier training complete.")
print(f"   Free tier: {len(FEATURES)} self-reported features")
print(f"   Premium DNN: 12 features including ECG + lab values")
