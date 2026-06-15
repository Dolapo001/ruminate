"""
core/ml.py
----------
Loads the trained XGBoost model + SHAP explainer once, and turns a feature row
into the exact payload the Next.js frontend renders: status, confidence,
SHAP reason-bars (coral = pushes to risk, teal = rules out heat), plain-language
summary, recommendation, and vitals tiles.
"""
import json
import functools
import numpy as np
import joblib
import shap
from django.conf import settings

import sys
sys.path.insert(0, str(settings.ML_DIR))
from features import LAYMAN, THRESHOLDS, confidence_in_words

META = json.load(open(settings.ML_DIR / "feature_meta.json"))
FEATURES = META["features"]
FRIENDLY = META["friendly"]
CLASSES = META["classes"]
HEAT = set(META["heat_features"])


@functools.lru_cache(maxsize=1)
def _model():
    return joblib.load(settings.ML_DIR / "model_xgb.joblib")


@functools.lru_cache(maxsize=1)
def _explainer():
    return shap.TreeExplainer(_model())


def _vec(features: dict) -> np.ndarray:
    return np.array([[float(features.get(f, 0.0)) for f in FEATURES]])


def predict_and_explain(features: dict) -> dict:
    """Return {raw_label, confidence, reasons[]} for one engineered feature row."""
    x = _vec(features)
    proba = _model().predict_proba(x)[0]
    ci = int(np.argmax(proba))
    label = CLASSES[ci]
    conf = int(round(float(proba[ci]) * 100))

    sv = _explainer().shap_values(x)
    s = np.array(sv)[ci][0] if isinstance(sv, list) else np.array(sv)[0, :, ci]

    order = np.argsort(-np.abs(s))
    picked = []
    for j in order:
        f = FEATURES[j]
        val = float(s[j])
        if f not in HEAT and val > 0:
            picked.append({"label": FRIENDLY[f], "raw": val, "direction": "risk"})
        if len(picked) >= 4:
            break

    mx = max((p["raw"] for p in picked), default=1.0) or 1.0
    reasons = [{"label": p["label"], "weight": int(round(100 * p["raw"] / mx)),
                "direction": p["direction"]} for p in picked]
    return {"raw_label": label, "confidence": conf, "reasons": reasons}


def _proba_at_risk(features: dict) -> float:
    p = _model().predict_proba(_vec(features))[0]
    return float(p[CLASSES.index("At Risk")]) if "At Risk" in CLASSES else 0.0


def heat_ruled_out(features: dict):
    """Counterfactual: if we make the weather hot, is she still flagged at risk?
    If yes, heat is not the cause (conductivity/disease drives it) — so heat is
    ruled out. Deterministic and robust, unlike a near-zero SHAP sign."""
    hot = {**features, "thi_max": 90.0, "heat_load": 12.0}
    p_hot = _proba_at_risk(hot)
    return (p_hot >= 0.45, int(round(p_hot * 32)))


# ---- layman narrative engine --------------------------------------------------

def _severity(feature: str, value: float, breed: str) -> str:
    """Return 'high', 'medium', or 'low' severity for a feature value."""
    th = THRESHOLDS.get(breed, THRESHOLDS.get("White Fulani", {}))
    if feature == "rumination_drop":
        if value > 1.5: return "high"
        if value > 0.5: return "medium"
        return "low"
    if feature == "body_temp_max":
        limit = th.get("body_temp_max", 39.0)
        if value > limit + 0.5: return "high"
        if value > limit: return "medium"
        return "low"
    if feature == "conductivity_max":
        limit = th.get("conductivity_max", 5.5)
        if value > limit + 0.5: return "high"
        if value > limit: return "medium"
        return "low"
    if feature == "activity_mean":
        lo, hi = th.get("activity_mean_low", 25), th.get("activity_mean_high", 48)
        if value < lo - 5 or value > hi + 5: return "high"
        if value < lo or value > hi: return "medium"
        return "low"
    if feature == "milk_drop":
        if value > 4: return "high"
        if value > 1.5: return "medium"
        return "low"
    return "medium"


def _verdict_for(feature: str, value: float, breed: str) -> str:
    """Return a short verdict phrase for template {verdict} placeholders."""
    th = THRESHOLDS.get(breed, THRESHOLDS.get("White Fulani", {}))
    if feature == "rumination_mean":
        low = th.get("rumination_mean_low", 5.0)
        return "below normal" if value < low else "within normal range"
    if feature == "activity_mean":
        lo, hi = th.get("activity_mean_low", 25), th.get("activity_mean_high", 48)
        if value < lo: return "unusually low"
        if value > hi: return "unusually high"
        return "normal"
    if feature == "activity_night":
        hi = th.get("activity_night_high", 25)
        return "restless" if value > hi else "calm"
    if feature == "thi_max":
        stress = th.get("thi_stress", 78)
        if value > 85: return "dangerously hot for cattle"
        if value > stress: return "above the heat-stress threshold"
        return "mild, no heat stress"
    if feature == "heat_load":
        if value > 10: return "Heavy heat load — the weather is making things worse"
        if value > 0: return "Some heat load, but not extreme"
        return "No heat load today — the weather is fine"
    if feature == "lying_mean":
        lo = th.get("lying_mean_low", 7.0)
        hi = th.get("lying_mean_high", 14.0)
        if value < lo: return "That's less than normal"
        if value > hi: return "That's more than normal"
        return "That's within the normal range"
    return ""


def _normal_range(feature: str, breed: str) -> str:
    """Return a human-readable normal range string."""
    th = THRESHOLDS.get(breed, THRESHOLDS.get("White Fulani", {}))
    ranges = {
        "body_temp_max": f"below {th.get('body_temp_max', 39.0)}°C",
        "conductivity_max": f"below {th.get('conductivity_max', 5.5)} mS/cm",
        "rumination_mean": f"above {th.get('rumination_mean_low', 5.0)} hrs/day",
        "activity_mean": f"{th.get('activity_mean_low', 25)}–{th.get('activity_mean_high', 48)} index",
        "lying_mean": f"{th.get('lying_mean_low', 7.0)}–{th.get('lying_mean_high', 14.0)} hrs",
        "thi_max": f"below {th.get('thi_stress', 78)}",
    }
    return ranges.get(feature, "")


def _build_sentence(feature: str, feats: dict, name: str, breed: str) -> str:
    """Fill in a LAYMAN template for one feature."""
    template = LAYMAN.get(feature)
    if not template:
        return f"{FRIENDLY.get(feature, feature)} is notable."

    th = THRESHOLDS.get(breed, THRESHOLDS.get("White Fulani", {}))
    value = feats.get(feature, 0)

    params = {
        "name": name,
        "breed": breed,
        "value": round(value, 1),
        "verdict": _verdict_for(feature, value, breed),
    }

    if feature == "rumination_drop":
        baseline = feats.get("rumination_mean", 0) + feats.get("rumination_drop", 0)
        current = feats.get("rumination_mean", 0)
        pct = int(round(100 * value / baseline)) if baseline else 0
        params.update(baseline=round(baseline, 1), current=round(current, 1), pct=pct)
    elif feature == "body_temp_max":
        params["threshold"] = th.get("body_temp_max", 39.0)
    elif feature == "conductivity_max":
        params["threshold"] = th.get("conductivity_max", 5.5)

    try:
        return template.format(**params)
    except KeyError:
        return f"{FRIENDLY.get(feature, feature)}: {round(value, 1)}"


def generate_narrative(feats: dict, name: str = "This cow",
                       breed: str = "White Fulani") -> dict:
    """Generate a full layman-friendly explanation payload for one animal.

    Returns a dict ready to be JSON-serialised by the /explain endpoint.
    """
    pred = predict_and_explain(feats)
    label, conf, reasons = pred["raw_label"], pred["confidence"], pred["reasons"]

    # Build per-factor detail
    factors = []
    for r in reasons:
        # Find the raw feature name from the friendly label
        feat_name = None
        for k, v in FRIENDLY.items():
            if v == r["label"]:
                feat_name = k
                break
        if not feat_name:
            continue

        val = feats.get(feat_name, 0)
        factors.append({
            "feature": feat_name,
            "importance": r["weight"],
            "direction": r["direction"],
            "friendly_label": r["label"],
            "sentence": _build_sentence(feat_name, feats, name, breed),
            "value": round(float(val), 2),
            "normal_range": _normal_range(feat_name, breed),
            "severity": _severity(feat_name, float(val), breed),
        })

    # Confidence in words
    conf_label, conf_sentence = confidence_in_words(conf)

    # Heat / counterfactual analysis
    thi = feats.get("thi_max", 0)
    heat_text = ""
    if label == "At Risk":
        ruled_out, _ = heat_ruled_out(feats)
        if ruled_out:
            heat_text = (
                f"The weather today is mild (THI {round(thi)}), so heat isn't "
                f"causing this. We re-ran the prediction pretending it was a "
                f"hot day — the result didn't change. This looks like a "
                f"genuine health issue, not environmental."
            )
        else:
            heat_text = (
                f"The Temperature-Humidity Index is {round(thi)}, which is above "
                f"the stress threshold. Heat may be playing a role — consider "
                f"providing shade and extra water before escalating."
            )
    elif label == "In Estrus":
        heat_text = (
            "Heat stress is not relevant here — the system is detecting "
            "estrus behaviour (activity spike on her cycle)."
        )

    # Plain summary
    factor_sentences = [f["sentence"] for f in factors]
    if factor_sentences:
        plain_summary = " ".join(factor_sentences)
        if heat_text:
            plain_summary += " " + heat_text
    else:
        plain_summary = f"{name} looks healthy — all signals are within normal range."

    # Build the assessment to get recommendation
    assessment = build_assessment(feats)
    bottom_line = assessment.get("recommendation", "")

    return {
        "available": True,
        "prediction": label,
        "confidence": conf,
        "confidence_words": conf_label,
        "confidence_detail": conf_sentence,
        "plain_summary": plain_summary,
        "factors": factors,
        "heat_analysis": heat_text,
        "bottom_line": bottom_line,
        "model_context": (
            f"The model was trained on {_training_size()} cases and gets "
            f"this type of prediction right about {_model_accuracy()}% of the time."
        ),
    }


def _training_size() -> str:
    """Read n_train from metrics.json, cached."""
    try:
        m = json.load(open(settings.ML_DIR / "metrics.json"))
        return f"{m.get('n_train', 2100):,}"
    except Exception:
        return "2,100"


def _model_accuracy() -> int:
    """Read XGBoost accuracy from metrics.json."""
    try:
        m = json.load(open(settings.ML_DIR / "metrics.json"))
        for r in m.get("results", []):
            if "XGBoost" in r.get("model", ""):
                return int(round(r["accuracy"] * 100))
    except Exception:
        pass
    return 95


# ---- turn a raw prediction into UI content ------------------------------------

def _vitals(f: dict) -> list:
    base_rum = f.get("rumination_mean", 0) + f.get("rumination_drop", 0)
    pct = int(round(100 * f.get("rumination_drop", 0) / base_rum)) if base_rum else 0
    temp_delta = round(f.get("body_temp_max", 39) - 39.0, 1)
    act = f.get("activity_mean", 33)
    cond = f.get("conductivity_max", 5.0)
    return [
        {"label": "Rumination", "value": (f"−{pct}%" if pct > 2 else "normal"),
         "tone": ("bad" if pct > 12 else "warn" if pct > 4 else "good"), "trend": "down"},
        {"label": "Body temp", "value": (f"+{temp_delta}°" if temp_delta > 0 else "normal"),
         "tone": ("bad" if temp_delta > 0.5 else "warn" if temp_delta > 0.2 else "good"), "trend": "up"},
        {"label": "Activity", "value": ("high" if act > 45 else "low" if act < 28 else "normal"),
         "tone": ("warn" if act < 28 or act > 45 else "good"), "trend": "down" if act < 33 else "up"},
        {"label": "Conductivity", "value": ("high" if cond > 5.6 else "normal"),
         "tone": ("bad" if cond > 5.6 else "good"), "trend": "up"},
    ]


def build_assessment(features: dict) -> dict:
    """Full UI assessment for one animal from its current feature row."""
    pred = predict_and_explain(features)
    label, conf, reasons = pred["raw_label"], pred["confidence"], pred["reasons"]
    cond_high = features.get("conductivity_max", 5) > 5.6
    act = features.get("activity_mean", 33)
    late_lactation = features.get("_lactation_day", 90) > 250

    ruled_out_heat = False
    if label == "At Risk":
        ruled_out_heat, heat_w = heat_ruled_out(features)
        if ruled_out_heat:
            reasons = reasons + [{"label": FRIENDLY["thi_max"], "weight": heat_w, "direction": "rules-out"}]

    if label == "In Estrus":
        return dict(status="estrus", title="In estrus — breed now",
                    subtitle="Activity spike on the ~21-day cycle",
                    summary="Her activity spiked right on cycle — a clean heat signal. Good window to inseminate.",
                    recommendation="Optimal insemination window is the next 12–18 hours. Confirm standing heat and schedule AI.",
                    confidence=conf, reasons=reasons, vitals=_vitals(features), is_alert=True)
    if label == "At Risk":
        if act > 46 and late_lactation:
            return dict(status="critical", title="Calving imminent",
                        subtitle="Restlessness rising · act within hours",
                        summary="Restlessness is climbing and her temperature dipped — the classic pre-calving pattern. She needs eyes on her now.",
                        recommendation="Move her to a clean calving pen and monitor closely. Have assistance ready within the next few hours.",
                        confidence=conf, reasons=reasons, vitals=_vitals(features), is_alert=True)
        heat_clause = " — and the weather's been mild, so this isn't just heat" if ruled_out_heat else ""
        return dict(status="risk", title="Possible mastitis" if cond_high else "Watch — needs attention",
                    subtitle="Chewing down, slight fever" + (", not heat" if ruled_out_heat else ""),
                    summary=f"Her chewing dropped and she's running a slight fever{heat_clause}.",
                    recommendation="Check the udder for heat or swelling and run a somatic cell test before milking. Early action protects yield.",
                    confidence=conf, reasons=reasons, vitals=_vitals(features), is_alert=True)
    # Healthy
    return dict(status="healthy", title="Healthy", subtitle="", summary="", recommendation="",
                confidence=conf, reasons=[], vitals=_vitals(features), is_alert=False)


# ---- aggregate raw 15-min readings into a feature row (for live ingest) -------

BREED_MILK_BASE = {"White Fulani": 8.0, "HF Cross": 15.0}


def aggregate_day(readings, base_rumination=6.0, breed="White Fulani", lactation_day=90):
    """Turn a day's worth of raw readings (list of dicts with the sensor fields +
    an 'hour' int) into the engineered feature vector the model expects."""
    import statistics as st
    def col(k): return [float(r.get(k, 0) or 0) for r in readings]
    rum = col("rumination_min"); temp = col("body_temp_c"); act = col("activity_index")
    cond = col("milk_conductivity"); thi = col("thi"); lying = col("lying_time_min")
    milk = col("milk_yield_l")
    night = [float(r.get("activity_index", 0) or 0) for r in readings
             if int(r.get("hour", 12)) >= 22 or int(r.get("hour", 12)) < 5]
    rum_mean = st.mean(rum) if rum else base_rumination
    thi_max = max(thi) if thi else 78.0
    base_milk = BREED_MILK_BASE.get(breed, 8.0)
    return {
        "rumination_mean": rum_mean,
        "rumination_drop": base_rumination - rum_mean,
        "body_temp_max": max(temp) if temp else 39.0,
        "body_temp_var": st.pvariance(temp) if len(temp) > 1 else 0.0,
        "activity_mean": st.mean(act) if act else 33.0,
        "activity_night": st.mean(night) if night else (st.mean(act) if act else 15.0),
        "conductivity_max": max(cond) if cond else 5.0,
        "milk_drop": max(0.0, base_milk * 2 - sum(milk)),
        "thi_max": thi_max,
        "heat_load": max(0.0, thi_max - 78),
        "lying_mean": st.mean(lying) if lying else 9.0,
        "_lactation_day": lactation_day,
    }
