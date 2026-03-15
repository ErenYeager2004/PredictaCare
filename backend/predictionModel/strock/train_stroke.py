
import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
import random
import tensorflow as tf

#  Verify running from backend/ directory
if not os.path.exists("predictionModel"):
    print("ERROR: Run this script from the backend/ directory:")
    print("   cd backend")
    print("   python predictionModel/strock/train_stroke.py")
    sys.exit(1)

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (
    classification_report, confusion_matrix,
    f1_score, roc_auc_score, roc_curve, accuracy_score
)
from sklearn.utils.class_weight import compute_class_weight
from imblearn.combine import SMOTETomek
from imblearn.over_sampling import SMOTE

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

warnings.filterwarnings("ignore")

#  Reproducibility
SEED = 42
np.random.seed(SEED)
random.seed(SEED)
tf.random.set_seed(SEED)

#  Paths
DATA_PATH      = "predictionModel/strock/healthcare-dataset-stroke-data.csv"
MODEL_DIR      = "predictionModel/h5Model"
SCALER_DIR     = "predictionModel/scalers"
MODEL_PATH     = "predictionModel/h5Model/stroke_model.h5"
SCALER_PATH    = "predictionModel/scalers/stroke_scaler.pkl"
COLUMNS_PATH   = "predictionModel/scalers/stroke_columns.pkl"
THRESHOLD_PATH = "predictionModel/scalers/stroke_threshold.json"

os.makedirs(MODEL_DIR,  exist_ok=True)
os.makedirs(SCALER_DIR, exist_ok=True)

#  Config
TARGET           = "stroke"
FEATURES_KEEP    = ["age", "hypertension", "heart_disease",
                    "avg_glucose_level", "bmi", "smoking_status"]
CATEGORICAL_COLS = ["smoking_status"]
SMOTE_RATIO      = 0.43
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
        print(f"   Found threshold meeting recall >= {min_recall}: {best_recall_t:.4f}")
        return best_recall_t, best_f1
    else:
        print(f"    No threshold met recall >= {min_recall}, using best F1: {best_f1_t:.4f}")
        return best_f1_t, best_f1


def evaluate(model, X_test, y_test, threshold):
    y_prob = model.predict(X_test, verbose=0).ravel()
    y_pred = (y_prob >= threshold).astype(int)
    print(f"\n{'='*55}")
    print("  STROKE RISK — Final Evaluation")
    print(f"{'='*55}")
    print(f"  Threshold : {threshold:.4f}")
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  F1 Score  : {f1_score(y_test, y_pred):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_prob):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["No Stroke", "Stroke"]))
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    fn_rate = cm[1][0] / (cm[1][0] + cm[1][1]) * 100
    print(f"\n  False Negative Rate (missed strokes): {fn_rate:.1f}%")


def get_callbacks():
    return [
        EarlyStopping(
            monitor="val_loss", patience=20,
            restore_best_weights=True, verbose=1
        ),
        ReduceLROnPlateau(
            monitor="val_loss", factor=0.5,
            patience=10, min_lr=1e-6, verbose=1
        ),
    ]


#  Step 1: Load
print("\n🚀 Stroke Risk — DNN Training")
print("=" * 55)

df = pd.read_csv(DATA_PATH)
print(f"  Raw dataset shape : {df.shape}")
print(f"  Target dist (raw) : {df[TARGET].value_counts().to_dict()}")

#  Step 2: Cleaning the dataset
print("\n🧹 Cleaning...")

# Drop non-causal and identifier columns
drop_cols = ["id", "gender", "ever_married", "work_type", "Residence_type"]
df = df.drop(columns=drop_cols)
print(f"  Dropped columns   : {drop_cols}")

# Drop rows with age < 18 — adult stroke model onl
before = len(df)
df = df[df["age"] >= 18]
print(f"  Dropped age < 18  : {before - len(df)} rows removed")

print(f"  Clean shape       : {df.shape}")
print(f"  Target dist       : {df[TARGET].value_counts().to_dict()}")

#  Step 3: BMI Imputation
print("\n🩺 Imputing BMI nulls by age group median...")
print(f"  BMI nulls before  : {df['bmi'].isnull().sum()}")


df["age_group"] = pd.cut(
    df["age"],
    bins=[0, 30, 40, 50, 60, 70, 200],
    labels=["18-30", "31-40", "41-50", "51-60", "61-70", "71+"]
)

bmi_medians = df.groupby("age_group", observed=True)["bmi"].median()
global_bmi_median = df["bmi"].median()
print("  BMI medians by age group:")
for group, median in bmi_medians.items():
    print(f"    {group}: {median:.1f}")

def impute_bmi(row):
    if not pd.isnull(row["bmi"]):
        return row["bmi"]
    age_group = row["age_group"]
    if pd.isnull(age_group) or age_group not in bmi_medians.index:
        return global_bmi_median
    return bmi_medians[age_group]

df["bmi"] = df.apply(impute_bmi, axis=1)
df = df.drop(columns=["age_group"])
print(f"  BMI nulls after   : {df['bmi'].isnull().sum()}")

#  Step 4: Features & Target
X = df[FEATURES_KEEP].copy()
y = df[TARGET].astype(int)

print(f"\n  Features used     : {FEATURES_KEEP}")
print(f"  Dataset shape     : {X.shape}")

#  Step 5: One-Hot Encode
print("\n🔢 Encoding categorical columns...")
X_encoded = pd.get_dummies(X, columns=CATEGORICAL_COLS)
columns = list(X_encoded.columns)
print(f"  Encoded columns ({len(columns)}): {columns}")

#  Step 6: Train/Test Split
# Split BEFORE resampling
X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y, test_size=0.2, random_state=SEED, stratify=y
)
print(f"\n  Train size        : {X_train.shape[0]}")
print(f"  Test size         : {X_test.shape[0]}")
print(f"  Train dist        : {dict(pd.Series(y_train).value_counts())}")
print(f"  Test dist         : {dict(pd.Series(y_test).value_counts())}")

#  Step 7: Scale
scaler = MinMaxScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

#  Step 8: Handle Imbalance

print(f"\n  Applying SMOTETomek (target ratio ~70:30)...")
print(f"  Before : {np.bincount(y_train.astype(int))}")

smote = SMOTE(random_state=SEED, sampling_strategy=SMOTE_RATIO)
smt   = SMOTETomek(random_state=SEED, smote=smote)
X_train_res, y_train_res = smt.fit_resample(X_train_s, y_train)

counts = np.bincount(y_train_res.astype(int))
print(f"  After  : {counts}")
print(f"  New ratio : {counts[0]/counts[1]:.1f}:1  ({counts[0]/(counts[0]+counts[1])*100:.0f}%:{counts[1]/(counts[0]+counts[1])*100:.0f}%)")

# Class weights for extra help in loss function
cw = compute_class_weight("balanced", classes=np.unique(y_train_res), y=y_train_res)
class_weights = dict(enumerate(cw))
print(f"  Class weights     : {class_weights}")

#  Step 9: Build Model
# Smaller network — only ~4k rows after cleaning
# Larger networks overfit badly on small medical datasets
print("\n  Building DNN...")

model = Sequential([
    Dense(128, activation="relu", kernel_regularizer=l2(0.01),
          input_shape=(X_train_res.shape[1],)),
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

#  Step 10: Train
print("\n  Training...")
model.fit(
    X_train_res, y_train_res,
    validation_data=(X_test_s, y_test),
    epochs=200,
    batch_size=32,
    class_weight=class_weights,
    callbacks=get_callbacks(),
    verbose=1
)

#  Step 11: Threshold Optimisation
print("\n🎯 Optimizing classification threshold...")
y_prob = model.predict(X_test_s, verbose=0).ravel()
threshold, best_f1 = optimize_threshold(y_test, y_prob)
print(f"  Optimal threshold : {threshold:.4f}")
print(f"  Default threshold : 0.5000  (F1={f1_score(y_test, (y_prob>=0.5).astype(int)):.4f})")

#  Step 12: Save Artifacts
print("\n Saving artifacts...")
model.save(MODEL_PATH)
joblib.dump(scaler, SCALER_PATH)
joblib.dump(columns, COLUMNS_PATH)
with open(THRESHOLD_PATH, "w") as f:
    json.dump({"threshold": threshold}, f)

print(f"  ✅ Model     → {MODEL_PATH}")
print(f"  ✅ Scaler    → {SCALER_PATH}")
print(f"  ✅ Columns   → {COLUMNS_PATH}")
print(f"  ✅ Threshold → {THRESHOLD_PATH}")

#  Step 13: Final Evaluation
evaluate(model, X_test_s, y_test, threshold)

print("\n Stroke model training complete.")
print("   Note: Stroke is life-threatening.")
print("   A false alarm is far less dangerous than a missed stroke.")
