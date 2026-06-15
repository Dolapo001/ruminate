"""
lstm_cv.py
----------
Adds the two things the proposal promised but the first pass skipped:

  1. A true TEMPORAL model — an LSTM over the raw 15-minute sensor sequences
     (one sequence per animal-day), so the deep model actually sees the shape
     of the day, not just daily aggregates.
  2. GROUPED 5-FOLD CROSS-VALIDATION (split by animal) for every model, so the
     headline numbers come with mean ± standard deviation instead of a single
     lucky split.

Writes the CV results into metrics.json (consumed by the dashboard's Model page)
without touching the served XGBoost model.
"""
import os, json, warnings
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.tree import DecisionTreeClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.utils.class_weight import compute_sample_weight, compute_class_weight
from sklearn.metrics import accuracy_score, f1_score
from xgboost import XGBClassifier

import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

from features import FEATURES
from train import add_label_noise

RNG = 42
np.random.seed(RNG); tf.random.set_seed(RNG)
SEQ_FEATURES = ["activity_index", "rumination_min", "body_temp_c", "milk_conductivity", "thi"]
STRIDE = 3                       # downsample 96 -> 32 timesteps/day
N_SPLITS = 5
CLASSES = ["At Risk", "Healthy", "In Estrus"]


def load_daily_with_noise():
    df = pd.read_csv("outputs/features_daily.csv")
    le = LabelEncoder().fit(df["label"])
    y = le.transform(df["label"])
    y = add_label_noise(y, list(le.classes_), rate=0.045)
    df["ylabel"] = y
    return df, le


def build_sequences(noisy_label):
    """One (T, 5) sequence per animal-day; labels pulled from the noisy daily map."""
    raw = pd.read_csv("outputs/raw_sensor_data.csv")
    X, y, groups = [], [], []
    for (aid, day), g in raw.groupby(["animal_id", "day"]):
        key = (aid, int(day))
        if key not in noisy_label:
            continue
        seq = g.sort_values("step")[SEQ_FEATURES].values[::STRIDE]
        X.append(seq); y.append(noisy_label[key]); groups.append(aid)
    return np.array(X, dtype="float32"), np.array(y), np.array(groups)


def lstm_model(T, F, n_classes):
    m = models.Sequential([
        layers.Input((T, F)),
        layers.Masking(),
        layers.LSTM(32),
        layers.Dropout(0.25),
        layers.Dense(16, activation="relu"),
        layers.Dense(n_classes, activation="softmax"),
    ])
    m.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return m


def main():
    df, le = load_daily_with_noise()
    Xtab = df[FEATURES].values
    ytab = df["ylabel"].values
    groups = df["animal_id"].values

    noisy_label = {(r.animal_id, int(r.day)): int(r.ylabel) for r in df.itertuples()}
    Xseq, yseq, gseq = build_sequences(noisy_label)
    print(f"Sequences: {Xseq.shape} (animal-days, timesteps, features)")

    gkf = GroupKFold(n_splits=N_SPLITS)
    scores = {m: {"acc": [], "f1": []} for m in
              ["Decision Tree (glass-box)", "Neural Net (black box)",
               "XGBoost + SHAP (ours)", "LSTM (deep temporal)"]}

    for fold, (tr, te) in enumerate(gkf.split(Xtab, ytab, groups), 1):
        sw = compute_sample_weight("balanced", ytab[tr])

        dt = DecisionTreeClassifier(max_depth=4, class_weight="balanced", random_state=RNG).fit(Xtab[tr], ytab[tr])
        mlp = make_pipeline(StandardScaler(), MLPClassifier((64, 32), max_iter=600, random_state=RNG)).fit(Xtab[tr], ytab[tr])
        xgb = XGBClassifier(n_estimators=350, max_depth=4, learning_rate=0.06, subsample=0.9,
                            colsample_bytree=0.9, reg_lambda=1.5, objective="multi:softprob",
                            num_class=3, eval_metric="mlogloss", random_state=RNG, n_jobs=4)
        xgb.fit(Xtab[tr], ytab[tr], sample_weight=sw)

        for name, model in [("Decision Tree (glass-box)", dt),
                            ("Neural Net (black box)", mlp),
                            ("XGBoost + SHAP (ours)", xgb)]:
            p = model.predict(Xtab[te])
            scores[name]["acc"].append(accuracy_score(ytab[te], p))
            scores[name]["f1"].append(f1_score(ytab[te], p, average="macro"))

        # --- LSTM fold (sequence split uses the same animal grouping) ---
        tr_a = set(groups[tr]); te_a = set(groups[te])
        s_tr = np.isin(gseq, list(tr_a)); s_te = np.isin(gseq, list(te_a))
        sc = StandardScaler().fit(Xseq[s_tr].reshape(-1, len(SEQ_FEATURES)))
        def norm(a): return sc.transform(a.reshape(-1, len(SEQ_FEATURES))).reshape(a.shape)
        Xtr_s, Xte_s = norm(Xseq[s_tr]), norm(Xseq[s_te])
        cw = compute_class_weight("balanced", classes=np.unique(yseq[s_tr]), y=yseq[s_tr])
        cwd = {int(c): float(w) for c, w in zip(np.unique(yseq[s_tr]), cw)}
        net = lstm_model(Xtr_s.shape[1], Xtr_s.shape[2], 3)
        net.fit(Xtr_s, yseq[s_tr], validation_split=0.0, epochs=12, batch_size=64,
                class_weight=cwd, verbose=0,
                callbacks=[callbacks.EarlyStopping(monitor="loss", patience=3, restore_best_weights=True)])
        pl = net.predict(Xte_s, verbose=0).argmax(1)
        scores["LSTM (deep temporal)"]["acc"].append(accuracy_score(yseq[s_te], pl))
        scores["LSTM (deep temporal)"]["f1"].append(f1_score(yseq[s_te], pl, average="macro"))
        print(f"  fold {fold}/{N_SPLITS} done")

    cv = []
    for name, s in scores.items():
        cv.append({
            "model": name,
            "accuracy_mean": round(float(np.mean(s["acc"])), 3),
            "accuracy_std": round(float(np.std(s["acc"])), 3),
            "f1_mean": round(float(np.mean(s["f1"])), 3),
            "f1_std": round(float(np.std(s["f1"])), 3),
        })
    print("\n5-fold grouped CV (mean ± std):")
    for c in cv:
        print(f"  {c['model']:28s} acc {c['accuracy_mean']:.3f}±{c['accuracy_std']:.3f}  "
              f"F1 {c['f1_mean']:.3f}±{c['f1_std']:.3f}")

    metrics = json.load(open("outputs/metrics.json"))
    metrics["cv_folds"] = N_SPLITS
    metrics["cv"] = cv
    json.dump(metrics, open("outputs/metrics.json", "w"), indent=2)
    print("\nWrote CV results into metrics.json")


if __name__ == "__main__":
    main()
