
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
    print("   python predictionModel/strock/train_stroke_lite.py")
    sys.exit(1)

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
DATA_PATH      = "predictionModel/strock/healthcare-dataset-stroke-data.csv"
LITE_DIR       = "predictionModel/lite_models"
MODEL_PATH     = "predictionModel/lite_models/stroke_lite.pkl"
COLUMNS_PATH   = "predictionModel/lite_models/stroke_lite_columns.pkl"
THRESHOLD_PATH = "predictionModel/lite_models/stroke_lite_threshold.json"

os.makedirs(LITE_DIR, exist_ok=True)

TARGET = "stroke"

FEATURES = [
    "age",
    "hypertension",
    "heart_disease",
    "avg_glucose_level",
    "bmi",
    "smoking_status",
]

CATEGORICAL_COLS = ["smoking_status"]
MIN_RECALL       = 0.80


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
    print("  STROKE FREE TIER — Final Evaluation")
    print(f"{'='*55}")
    print(f"  Threshold : {threshold:.4f}")
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  F1 Score  : {f1_score(y_test, y_pred):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_prob):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=["No Stroke", "Stroke"]))
    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    print(f"\n  False Negative Rate: {cm[1][0]/(cm[1][0]+cm[1][1])*100:.1f}%")


#  Load & Clean
print("\n🚀 Stroke FREE TIER — XGBoost Training (Beta)")
print("=" * 55)

df = pd.read_csv(DATA_PATH)
print(f"  Raw shape : {df.shape}")

# Same cleaning as premium model
before = len(df)
df = df[df["gender"] != "Other"]
df = df[df["age"] >= 18]
print(f"  Dropped {before - len(df)} rows (Other gender + age < 18)")

# BMI imputation by age group median
df["age_group"] = pd.cut(
    df["age"],
    bins=[0, 30, 40, 50, 60, 70, 200],
    labels=["18-30", "31-40", "41-50", "51-60", "61-70", "71+"]
)
bmi_medians        = df.groupby("age_group", observed=True)["bmi"].median()
global_bmi_median  = df["bmi"].median()

def impute_bmi(row):
    if not pd.isnull(row["bmi"]):
        return row["bmi"]
    ag = row["age_group"]
    if pd.isnull(ag) or ag not in bmi_medians.index:
        return global_bmi_median
    return bmi_medians[ag]

df["bmi"] = df.apply(impute_bmi, axis=1)
df = df.drop(columns=["age_group"])
print(f"  BMI nulls after imputation: {df['bmi'].isnull().sum()}")
print(f"  Clean shape : {df.shape}")
print(f"  Target dist : {df[TARGET].value_counts().to_dict()}")

#  Features
X = df[FEATURES].copy()
y = df[TARGET].astype(int)

X = pd.get_dummies(X, columns=CATEGORICAL_COLS)
columns = list(X.columns)
print(f"\n  Features ({len(columns)}): {columns}")

#  Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=SEED, stratify=y
)
print(f"\n  Train: {X_train.shape[0]}  Test: {X_test.shape[0]}")


counts           = np.bincount(y_train)
scale_pos_weight = counts[0] / counts[1]
print(f"  scale_pos_weight: {scale_pos_weight:.2f}  (handles severe {counts[0]/counts[1]:.1f}:1 imbalance)")

#  Train
print("\n  Training XGBoost...")
model = XGBClassifier(
    n_estimators      = 300,
    max_depth         = 4,
    learning_rate     = 0.05,
    subsample         = 0.8,
    colsample_bytree  = 0.8,
    min_child_weight  = 5,      # conservative — small dataset + severe imbalance
    gamma             = 0.2,
    scale_pos_weight  = scale_pos_weight,
    use_label_encoder = False,
    eval_metric       = "auc",
    random_state      = SEED,
    n_jobs            = -1,
)

model.fit(
    X_train, y_train,
    eval_set = [(X_test, y_test)],
    verbose  = 50,
)

#  Threshold & Save
print("\n Optimizing threshold...")
y_prob       = model.predict_proba(X_test)[:, 1]
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
    print(f"  {feat:<35} {imp:.4f}")

print("\n Stroke free tier training complete.")
print("     Both stroke models (free + premium) are Beta.")
print("   Label clearly in UI — dataset too small for high confidence.")
