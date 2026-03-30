import joblib
import pandas as pd
import json
from tensorflow.keras.models import load_model

model     = load_model('predictionModel/h5Model/heart_model.h5')
scaler    = joblib.load('predictionModel/scalers/heart_scaler.pkl')
columns   = joblib.load('predictionModel/scalers/heart_columns.pkl')
threshold = json.load(open('predictionModel/scalers/heart_threshold.json'))['threshold']
medians   = json.load(open('predictionModel/scalers/heart_medians.json'))

print(f"Threshold: {threshold}")
print(f"MODERATE range: {round(threshold*0.9*100,1)}% – {round(threshold*100,1)}%\n")

def test(data, label):
    row = {}
    row['age']      = float(data['age'])
    row['sex']      = float(data['sex'])
    row['trestbps'] = float(data['trestbps'])
    row['exang']    = float(data['exang'])
    row['cp']       = int(data['cp'])

    optional_originals = ["chol", "restecg", "thalach", "oldpeak", "slope", "ca", "thal"]
    categorical_feats  = ["cp", "restecg", "slope", "thal"]

    for feat in optional_originals:
        ind_col  = feat + "_provided"
        provided = feat in data
        if feat in categorical_feats:
            feat_cols = [c for c in medians if c.startswith(feat + "_")]
            if provided:
                val = int(data[feat])
                for c in feat_cols:
                    suffix = int(c.split("_")[-1])
                    row[c] = 1 if val == suffix else 0
            else:
                for c in feat_cols:
                    row[c] = medians.get(c, 0)
            row[ind_col] = 1 if provided else 0
        else:
            row[feat]    = float(data[feat]) if provided else medians.get(feat, 0)
            row[ind_col] = 1 if provided else 0

    df = pd.DataFrame([row])
    df = pd.get_dummies(df, columns=["cp"])
    for col in columns:
        if col not in df.columns:
            df[col] = 0
    df = df[columns].astype(float)
    scaled = scaler.transform(df)
    raw  = float(model.predict(scaled, verbose=0)[0][0])
    prob = 1.0 - raw
    risk = 'HIGH' if prob >= threshold else 'MODERATE' if prob >= threshold*0.9 else 'LOW'
    print(f"[{risk:8}] {round(prob*100,1):5}%  {label}")
    return prob

print("=== SWEEPING ca + thal + oldpeak combinations ===")
results = []
for ca in [0, 1, 2]:
    for thal in [1, 2, 3]:
        for oldpeak in [0.5, 1.0, 1.5, 2.0]:
            for thalach in [130, 140, 150, 160]:
                data = {
                    'age':55,'sex':1,'cp':1,'trestbps':138,'exang':0,
                    'chol':220,'thalach':thalach,'oldpeak':oldpeak,
                    'restecg':1,'slope':1,'ca':ca,'thal':thal
                }
                row = {}
                row['age']      = float(data['age'])
                row['sex']      = float(data['sex'])
                row['trestbps'] = float(data['trestbps'])
                row['exang']    = float(data['exang'])
                row['cp']       = int(data['cp'])
                for feat in optional_originals:
                    ind_col  = feat + "_provided"
                    provided = feat in data
                    if feat in categorical_feats:
                        feat_cols = [c for c in medians if c.startswith(feat + "_")]
                        if provided:
                            val = int(data[feat])
                            for c in feat_cols:
                                suffix = int(c.split("_")[-1])
                                row[c] = 1 if val == suffix else 0
                        else:
                            for c in feat_cols:
                                row[c] = medians.get(c, 0)
                        row[ind_col] = 1 if provided else 0
                    else:
                        row[feat]    = float(data[feat]) if provided else medians.get(feat, 0)
                        row[ind_col] = 1 if provided else 0
                df = pd.DataFrame([row])
                df = pd.get_dummies(df, columns=["cp"])
                for col in columns:
                    if col not in df.columns:
                        df[col] = 0
                df = df[columns].astype(float)
                scaled = scaler.transform(df)
                raw  = float(model.predict(scaled, verbose=0)[0][0])
                prob = 1.0 - raw
                risk = 'HIGH' if prob >= threshold else 'MODERATE' if prob >= threshold*0.9 else 'LOW'
                if risk == 'MODERATE':
                    results.append((prob, data))

optional_originals = ["chol", "restecg", "thalach", "oldpeak", "slope", "ca", "thal"]
categorical_feats  = ["cp", "restecg", "slope", "thal"]

if results:
    print(f"\n✅ Found {len(results)} MODERATE cases!")
    for prob, data in results[:5]:
        print(f"  {round(prob*100,1)}% → {data}")
else:
    print("\n❌ No MODERATE found in sweep — model may be too binary")
    print("\nShowing closest to moderate zone:")
    all_results = []
    for ca in [0,1,2]:
        for thal in [1,2,3]:
            for oldpeak in [0.5,1.0,1.5,2.0,2.5]:
                for thalach in [120,130,140,150,160]:
                    data = {'age':55,'sex':1,'cp':1,'trestbps':138,'exang':0,
                            'chol':220,'thalach':thalach,'oldpeak':oldpeak,
                            'restecg':1,'slope':1,'ca':ca,'thal':thal}
                    row = {}
                    row['age']=float(data['age']); row['sex']=float(data['sex'])
                    row['trestbps']=float(data['trestbps']); row['exang']=float(data['exang'])
                    row['cp']=int(data['cp'])
                    for feat in optional_originals:
                        ind_col=feat+"_provided"; provided=feat in data
                        if feat in categorical_feats:
                            feat_cols=[c for c in medians if c.startswith(feat+"_")]
                            if provided:
                                val=int(data[feat])
                                for c in feat_cols:
                                    suffix=int(c.split("_")[-1]); row[c]=1 if val==suffix else 0
                            else:
                                for c in feat_cols: row[c]=medians.get(c,0)
                            row[ind_col]=1 if provided else 0
                        else:
                            row[feat]=float(data[feat]) if provided else medians.get(feat,0)
                            row[ind_col]=1 if provided else 0
                    df=pd.DataFrame([row]); df=pd.get_dummies(df,columns=["cp"])
                    for col in columns:
                        if col not in df.columns: df[col]=0
                    df=df[columns].astype(float); scaled=scaler.transform(df)
                    raw=float(model.predict(scaled,verbose=0)[0][0]); prob=1.0-raw
                    all_results.append((abs(prob - threshold*0.95), prob, data))
    all_results.sort()
    for _, prob, data in all_results[:5]:
        risk='HIGH' if prob>=threshold else 'MODERATE' if prob>=threshold*0.9 else 'LOW'
        print(f"  [{risk}] {round(prob*100,1)}% → ca={data['ca']} thal={data['thal']} oldpeak={data['oldpeak']} thalach={data['thalach']}")
