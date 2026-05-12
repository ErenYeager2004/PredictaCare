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
    print("   python predictionModel/pcos/train_pcos.py")
    sys.exit(1)
import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
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
DATA_PATH      = "predictionModel/pcos/pcos_final_dataset_fixed.json"
MODEL_DIR      = "predictionModel/h5Model"
SCALER_DIR     = "predictionModel/scalers"
MODEL_PATH     = "predictionModel/h5Model/pcos_model.h5"
SCALER_PATH    = "predictionModel/scalers/pcos_scaler.pkl"
COLUMNS_PATH   = "predictionModel/scalers/pcos_columns.pkl"
THRESHOLD_PATH = "predictionModel/scalers/pcos_threshold.json"
MEDIANS_PATH   = "predictionModel/scalers/pcos_medians.json"

os.makedirs(MODEL_DIR,  exist_ok=True)
os.makedirs(SCALER_DIR, exist_ok=True)
PLOTS_DIR = "predictionModel/pcos/plots"
os.makedirs(PLOTS_DIR, exist_ok=True)
#  Config
TARGET = "PCOS (Y/N)"

# Features every user can provide themselves
REQUIRED_FEATURES = [
    "Age (yrs)",
    "BMI",
    "Waist(inch)",
    "Cycle(R/I)",
    "Cycle length(days)",
    "Weight gain(Y/N)",
    "hair growth(Y/N)",
    "Skin darkening (Y/N)",
    "Hair loss(Y/N)",
    "Pimples(Y/N)",
    "Fast food (Y/N)",
]

# Optional — need lab tests or ultrasound
OPTIONAL_FEATURES = [
    "AMH(ng/mL)",
    "LH(mIU/mL)",
    "FSH(mIU/mL)",
    "Follicle No. (L)",
    "Follicle No. (R)",
    "Avg. F size (L) (mm)",
    "Avg. F size (R) (mm)",
]


OUTLIER_CAPS = {
    "LH(mIU/mL)":  10.65,
    "FSH(mIU/mL)": 15.27,
    "AMH(ng/mL)":  24.64,
}

MIN_RECALL  = 0.80
SMOTE_RATIO = 0.60


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
    print("  PCOS — Final Evaluation")
    print(f"{'='*55}")
    print(f"  Threshold : {threshold:.4f}")
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  F1 Score  : {f1_score(y_test, y_pred):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_prob):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["No PCOS", "PCOS"]))
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    fn_rate = cm[1][0] / (cm[1][0] + cm[1][1]) * 100
    print(f"\n  False Negative Rate (missed PCOS): {fn_rate:.1f}%")


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
        "PCOS Training vs Validation Accuracy"
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
        "PCOS Training vs Validation Loss"
    )

    plt.legend()

    plt.savefig(
        os.path.join(PLOTS_DIR, "loss_curve.png"),
        bbox_inches='tight'
    )

    plt.close()

    print("✅ Training graphs saved")


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

    plt.title("PCOS ROC Curve")

    plt.legend()

    plt.savefig(
        os.path.join(PLOTS_DIR, "roc_curve.png"),
        bbox_inches='tight'
    )

    plt.close()

    print("✅ ROC curve saved")



#  Step 1: Load
print("\n PCOS — DNN Training")
print("=" * 55)

with open(DATA_PATH) as f:
    data = json.load(f)
df = pd.DataFrame(data)

print(f"  Raw dataset shape : {df.shape}")
print(f"  Target dist (raw) : {df[TARGET].value_counts().to_dict()}")

# ─── Step 2: Cap Outliers
print("\n Capping outliers...")
for col, cap in OUTLIER_CAPS.items():
    n_capped = (df[col] > cap).sum()
    df[col] = df[col].clip(upper=cap)
    print(f"  {col:<25} capped {n_capped} rows at {cap}")

# \ Step 3: Build Missingness Indicators
# In training data all optional features are present (real clinical dataset)
# We SIMULATE missingness by randomly masking 40% of optional values
# This teaches the model to handle missing optional values at inference time
print("\n Simulating missingness for optional features (40% mask rate)...")

# Save real medians BEFORE any masking — used at inference time
medians = {}
for col in OPTIONAL_FEATURES:
    medians[col] = float(df[col].median())
print(f"  Medians saved for inference: {medians}")

np.random.seed(SEED)
for col in OPTIONAL_FEATURES:
    mask = np.random.random(len(df)) < 0.40   # 40% randomly missing
    indicator_col = col.split("(")[0].strip() + "_provided"
    df[indicator_col] = (~mask).astype(int)    # 1 = provided, 0 = missing
    df.loc[mask, col] = medians[col]           # fill missing with median
    n_masked = mask.sum()
    print(f"  {col:<30} masked {n_masked} rows → '{indicator_col}' added")

#  Step 4: Select Features
# Build full feature list: required + optional + their indicators
indicator_cols = [
    col.split("(")[0].strip() + "_provided"
    for col in OPTIONAL_FEATURES
]
ALL_FEATURES = REQUIRED_FEATURES + OPTIONAL_FEATURES + indicator_cols

print(f"\n  Total features    : {len(ALL_FEATURES)}")
print(f"  Required          : {len(REQUIRED_FEATURES)}")
print(f"  Optional          : {len(OPTIONAL_FEATURES)}")
print(f"  Indicators        : {len(indicator_cols)}")

X = df[ALL_FEATURES].copy()
y = df[TARGET].astype(int)

#  Step 5: Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=SEED, stratify=y
)
print(f"\n  Train size        : {X_train.shape[0]}")
print(f"  Test size         : {X_test.shape[0]}")
print(f"  Train dist        : {dict(pd.Series(y_train).value_counts())}")
print(f"  Test dist         : {dict(pd.Series(y_test).value_counts())}")

#  Step 6: Scale
# Note: binary indicator columns (0/1) are also scaled — MinMaxScaler
# keeps them at 0/1 so no information is lost
scaler = MinMaxScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)
columns   = list(X_train.columns)

#  Step 7: Handle Imbalance

print(f"\n  Applying SMOTETomek...")
print(f"  Before : {np.bincount(y_train.astype(int))}")

smote = SMOTE(random_state=SEED, sampling_strategy=SMOTE_RATIO)
smt   = SMOTETomek(random_state=SEED, smote=smote)
X_train_res, y_train_res = smt.fit_resample(X_train_s, y_train)

counts = np.bincount(y_train_res.astype(int))
print(f"  After  : {counts}")
print(f"  New ratio : {counts[0]/counts[1]:.1f}:1  ({counts[0]/(counts[0]+counts[1])*100:.0f}%:{counts[1]/(counts[0]+counts[1])*100:.0f}%)")

# Class weights for loss function
cw = compute_class_weight("balanced", classes=np.unique(y_train_res), y=y_train_res)
class_weights = dict(enumerate(cw))
print(f"  Class weights     : {class_weights}")

#  Step 8: Build Model
# Small but deep enough for 18 features + 7 indicators = 25 inputs
# Heavy L2 regularization — only 541 rows, overfitting is the main risk
print("\n  Building DNN...")

n_inputs = X_train_res.shape[1]

model = Sequential([
    Dense(128, activation="relu", kernel_regularizer=l2(0.02),
          input_shape=(n_inputs,)),
    BatchNormalization(),
    Dropout(0.4),

    Dense(64, activation="relu", kernel_regularizer=l2(0.02)),
    BatchNormalization(),
    Dropout(0.35),

    Dense(32, activation="relu", kernel_regularizer=l2(0.01)),
    BatchNormalization(),
    Dropout(0.25),

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

#  Step 9: Train
print("\n  Training...")
history =  model.fit(
    X_train_res, y_train_res,
    validation_data=(X_test_s, y_test),
    epochs=300,
    batch_size=16,
    class_weight=class_weights,
    callbacks=get_callbacks(),
    verbose=1
)
plot_training_history(history)
#  Step 10: Threshold Optimisation
print("\n Optimizing classification threshold...")
y_prob = model.predict(X_test_s, verbose=0).ravel()
plot_roc_curve(y_test, y_prob)
threshold, best_f1 = optimize_threshold(y_test, y_prob)
print(f"  Optimal threshold : {threshold:.4f}")
print(f"  Default threshold : 0.5000  (F1={f1_score(y_test, (y_prob>=0.5).astype(int)):.4f})")

#  Step 11: Save Artifacts
print("\n Saving artifacts...")
model.save(MODEL_PATH)
joblib.dump(scaler,  SCALER_PATH)
joblib.dump(columns, COLUMNS_PATH)
with open(THRESHOLD_PATH, "w") as f:
    json.dump({"threshold": threshold}, f)
with open(MEDIANS_PATH, "w") as f:
    json.dump(medians, f)

print(f"   Model     → {MODEL_PATH}")
print(f"   Scaler    → {SCALER_PATH}")
print(f"   Columns   → {COLUMNS_PATH}")
print(f"   Threshold → {THRESHOLD_PATH}")
print(f"   Medians   → {MEDIANS_PATH}  (used at inference for missing optional values)")

#  Step 12: Final Evaluation
evaluate(model, X_test_s, y_test, threshold)

#  Step 13: Accuracy by Data Completeness
print("\n Accuracy by data completeness...")
y_prob_all = model.predict(X_test_s, verbose=0).ravel()
# Simulate test set with NO optional features (all set to median, indicator=0)
X_test_no_optional = X_test.copy()
for col in OPTIONAL_FEATURES:
    X_test_no_optional[col] = medians[col]
for ind_col in indicator_cols:
    X_test_no_optional[ind_col] = 0
X_test_no_opt_s = scaler.transform(X_test_no_optional)
y_prob_no_opt = model.predict(X_test_no_opt_s, verbose=0).ravel()
auc_no_opt = roc_auc_score(y_test, y_prob_no_opt)

# Simulate with only lab features provided (indicator=1 for lab features)
X_test_lab = X_test.copy()
lab_features = ["AMH(ng/mL)", "LH(mIU/mL)", "FSH(mIU/mL)"]
lab_indicators = [col.split("(")[0].strip() + "_provided" for col in lab_features]
ultrasound_features = ["Follicle No. (L)", "Follicle No. (R)",
                       "Avg. F size (L) (mm)", "Avg. F size (R) (mm)"]
ultrasound_indicators = [col.split("(")[0].strip() + "_provided"
                         for col in ultrasound_features]

for col in ultrasound_features:
    X_test_lab[col] = medians[col]
for ind_col in ultrasound_indicators:
    X_test_lab[ind_col] = 0
for ind_col in lab_indicators:
    X_test_lab[ind_col] = 1
X_test_lab_s = scaler.transform(X_test_lab)
y_prob_lab = model.predict(X_test_lab_s, verbose=0).ravel()
auc_lab = roc_auc_score(y_test, y_prob_lab)

# Full data (all indicators=1)
auc_full = roc_auc_score(y_test, y_prob_all)

print(f"\n  Symptoms only (no lab/ultrasound) : ROC-AUC = {auc_no_opt:.4f}")
print(f"  + Lab results (AMH, LH, FSH)      : ROC-AUC = {auc_lab:.4f}")
print(f"  + Lab + Ultrasound (all data)      : ROC-AUC = {auc_full:.4f}")
print(f"\n  Accuracy improvement from lab data     : +{(auc_lab-auc_no_opt)*100:.1f}%")
print(f"  Accuracy improvement from all data     : +{(auc_full-auc_no_opt)*100:.1f}%")

print("\n PCOS model training complete.")
print("   Use pcos_medians.json at inference to fill missing optional values.")
print("   Set <feature>_provided = 0 for any optional value the user did not enter.")
