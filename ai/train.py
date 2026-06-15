"""
train.py
--------
Trains and compares three tiers of model on the daily features:

  glass-box   : Decision Tree            (natively readable, weak)
  interpretable: XGBoost  + SHAP         (our workhorse — strong AND explainable)
  black box    : MLP neural network      (strong, opaque — the thing we beat on trust)

Split is GROUPED BY ANIMAL so no cow appears in both train and test (prevents
leakage). Class imbalance is handled with balanced sample weights. We report
accuracy, macro-F1 and macro-AUC, save a confusion matrix + model-comparison +
SHAP summary figure, and persist the XGBoost model + feature metadata for the
Django backend to serve.
"""

import json
import warnings
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.tree import DecisionTreeClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, confusion_matrix, classification_report
from xgboost import XGBClassifier
import shap

from features import FEATURES, FRIENDLY

warnings.filterwarnings("ignore")
RNG = 42
GOLD, TERRA, GREEN, TEAL, INK = "#F0C24A", "#EA6A40", "#3DD88C", "#2FD6C2", "#13100A"


def load():
    df = pd.read_csv("outputs/features_daily.csv")
    X = df[FEATURES].values
    le = LabelEncoder().fit(df["label"])
    y = le.transform(df["label"])
    groups = df["animal_id"].values
    return df, X, y, groups, le


def split(X, y, groups):
    gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=RNG)
    tr, te = next(gss.split(X, y, groups))
    return tr, te


def evaluate(name, model, Xte, yte, classes):
    pred = model.predict(Xte)
    proba = model.predict_proba(Xte)
    acc = accuracy_score(yte, pred)
    f1 = f1_score(yte, pred, average="macro")
    try:
        auc = roc_auc_score(yte, proba, multi_class="ovr", average="macro")
    except ValueError:
        auc = float("nan")
    return {"model": name, "accuracy": round(acc, 3), "macro_f1": round(f1, 3),
            "macro_auc": round(auc, 3)}, pred


def add_label_noise(y, classes, rate=0.06, seed=RNG):
    """Simulate imperfect ground truth (missed/mislogged events).
    Random, not a systematic heat->disease bias, so SHAP associations stay valid."""
    rng = np.random.default_rng(seed)
    y = y.copy()
    n = len(y)
    flip = rng.random(n) < rate
    k = len(classes)
    for i in np.where(flip)[0]:
        choices = [c for c in range(k) if c != y[i]]
        # bias flips toward "Healthy" (index of Healthy), mimicking missed events
        try:
            h = classes.index("Healthy")
            weights = [3.0 if c == h else 1.0 for c in choices]
        except ValueError:
            weights = None
        p = np.array(weights) / np.sum(weights) if weights else None
        y[i] = rng.choice(choices, p=p)
    return y


def main():
    df, X, y, groups, le = load()
    classes = list(le.classes_)
    y = add_label_noise(y, classes, rate=0.045)
    tr, te = split(X, y, groups)
    Xtr, Xte, ytr, yte = X[tr], X[te], y[tr], y[te]
    sw = compute_sample_weight("balanced", ytr)

    models = {}

    # glass-box
    dt = DecisionTreeClassifier(max_depth=4, class_weight="balanced", random_state=RNG).fit(Xtr, ytr)
    models["Decision Tree (glass-box)"] = dt

    # black box
    mlp = make_pipeline(StandardScaler(),
                        MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=600, random_state=RNG))
    mlp.fit(Xtr, ytr)
    models["Neural Net (black box)"] = mlp

    # interpretable workhorse
    xgb = XGBClassifier(
        n_estimators=350, max_depth=4, learning_rate=0.06,
        subsample=0.9, colsample_bytree=0.9, reg_lambda=1.5,
        objective="multi:softprob", num_class=len(classes),
        eval_metric="mlogloss", random_state=RNG, n_jobs=4,
    )
    xgb.fit(Xtr, ytr, sample_weight=sw)
    models["XGBoost + SHAP (ours)"] = xgb

    results = []
    preds = {}
    for name, m in models.items():
        r, p = evaluate(name, m, Xte, yte, classes)
        results.append(r); preds[name] = p
        print(f"{name:30s}  acc={r['accuracy']:.3f}  macroF1={r['macro_f1']:.3f}  macroAUC={r['macro_auc']:.3f}")

    metrics = {"classes": classes, "n_train": int(len(tr)), "n_test": int(len(te)),
               "results": results}

    print("\nXGBoost per-class report (test):")
    print(classification_report(yte, preds["XGBoost + SHAP (ours)"], target_names=classes, zero_division=0))

    # ---- figure 1: model comparison ----
    fig, ax = plt.subplots(figsize=(8, 4.2))
    names = [r["model"] for r in results]
    f1s = [r["macro_f1"] for r in results]
    accs = [r["accuracy"] for r in results]
    xpos = np.arange(len(names)); w = 0.38
    ax.bar(xpos - w/2, accs, w, label="Accuracy", color=GOLD)
    ax.bar(xpos + w/2, f1s, w, label="Macro-F1", color=TEAL)
    ax.set_xticks(xpos); ax.set_xticklabels(names, rotation=12, ha="right", fontsize=9)
    ax.set_ylim(0, 1.05); ax.set_title("Accuracy vs interpretability — model comparison")
    ax.legend(); ax.grid(axis="y", alpha=.2); fig.tight_layout()
    fig.savefig("outputs/fig_model_comparison.png", dpi=130); plt.close(fig)

    # ---- figure 2: confusion matrix (XGBoost) ----
    cm = confusion_matrix(yte, preds["XGBoost + SHAP (ours)"])
    fig, ax = plt.subplots(figsize=(5.2, 4.6))
    im = ax.imshow(cm, cmap="YlOrBr")
    ax.set_xticks(range(len(classes))); ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes); ax.set_yticklabels(classes)
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual"); ax.set_title("XGBoost confusion matrix")
    for i in range(len(classes)):
        for j in range(len(classes)):
            ax.text(j, i, cm[i, j], ha="center", va="center",
                    color="black" if cm[i, j] < cm.max()/2 else "white", fontsize=11)
    fig.tight_layout(); fig.savefig("outputs/fig_confusion_matrix.png", dpi=130); plt.close(fig)

    # ---- SHAP global summary ----
    explainer = shap.TreeExplainer(xgb)
    sv = explainer.shap_values(Xte)

    # global feature importance (mean |SHAP| across samples and classes)
    arr = np.stack(sv, axis=-1) if isinstance(sv, list) else np.array(sv)
    if arr.ndim == 2:
        arr = arr[..., None]
    importance = np.abs(arr).mean(axis=(0, 2))
    metrics["feature_importance"] = sorted(
        [{"feature": FRIENDLY[f], "importance": round(float(importance[i]), 4)}
         for i, f in enumerate(FEATURES)], key=lambda d: -d["importance"])
    metrics["confusion_matrix"] = cm.tolist()
    json.dump(metrics, open("outputs/metrics.json", "w"), indent=2)

    plt.figure()
    shap.summary_plot(sv, Xte, feature_names=[FRIENDLY[f] for f in FEATURES],
                      class_names=classes, show=False, plot_type="bar", max_display=11)
    plt.title("Global feature importance (mean |SHAP|)")
    plt.tight_layout(); plt.savefig("outputs/fig_shap_summary.png", dpi=130, bbox_inches="tight"); plt.close()

    # ---- persist artifacts for the backend ----
    joblib.dump(xgb, "outputs/model_xgb.joblib")
    meta = {"features": FEATURES, "friendly": FRIENDLY, "classes": classes,
            "heat_features": ["thi_max", "heat_load"]}
    json.dump(meta, open("outputs/feature_meta.json", "w"), indent=2)

    # latest-day engineered row per animal (for backend seeding)
    latest = df.sort_values("day").groupby("animal_id").tail(1).reset_index(drop=True)
    latest.to_csv("outputs/herd_latest.csv", index=False)

    print("\nSaved: model_xgb.joblib, feature_meta.json, herd_latest.csv, metrics.json, 3 figures.")


if __name__ == "__main__":
    main()
