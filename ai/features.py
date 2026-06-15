"""
features.py
-----------
Turns raw 15-minute sensor readings into one engineered sample per
animal-per-day. Features encode deviations from each animal's OWN baseline
(z-scores) plus the Nigerian heat-load confounder, so the model and SHAP can
tell "sick" apart from "hot".

Reused by both the training pipeline and the Django inference service, so the
features at serve-time match the features at train-time exactly.
"""

import numpy as np
import pandas as pd

# Night window (steps): ~22:00–05:00 at 15-min resolution (step 88..96, 0..20)
NIGHT_STEPS = set(range(88, 96)) | set(range(0, 20))

# Friendly labels for explanations (feature -> human phrase)
FRIENDLY = {
    "rumination_drop": "Rumination ↓",
    "rumination_mean": "Rumination level",
    "body_temp_max": "Body temp ↑",
    "body_temp_var": "Temp variability",
    "activity_mean": "Activity",
    "activity_night": "Nocturnal activity",
    "conductivity_max": "Milk conductivity ↑",
    "milk_drop": "Milk yield ↓",
    "thi_max": "Weather (THI)",
    "heat_load": "Heat load",
    "lying_mean": "Lying time",
}
FEATURES = list(FRIENDLY.keys())
# Feature that represents environmental heat (used to phrase "rules out heat")
HEAT_FEATURES = {"thi_max", "heat_load"}

# ---- Layman-friendly explanation templates (used by the narrative engine) ------
# Each template receives named fields from the feature dict + animal metadata.
# Placeholders: {value}, {baseline}, {current}, {threshold}, {breed}, {name}, {pct}
LAYMAN = {
    "rumination_drop": (
        "{name}'s chewing has dropped {pct}% below her own baseline — "
        "she normally chews about {baseline} hrs/day, today only {current}."
    ),
    "rumination_mean": (
        "{name}'s overall chewing level is {value} hrs/day, which is "
        "{verdict} for {breed} cattle."
    ),
    "body_temp_max": (
        "Her body temperature peaked at {value}°C — anything above "
        "{threshold}°C is a mild fever for {breed}."
    ),
    "body_temp_var": (
        "Her temperature has been swinging more than usual today "
        "(variability: {value}), which can signal the body fighting an infection."
    ),
    "activity_mean": (
        "Her overall activity level is {verdict} ({value} index points). "
        "A sudden spike may indicate estrus; a drop may indicate illness."
    ),
    "activity_night": (
        "She was {verdict} during the night ({value} index points). "
        "Restlessness at night often signals pain or approaching calving."
    ),
    "conductivity_max": (
        "Her milk conductivity peaked at {value} mS/cm — above "
        "{threshold} mS/cm often points to udder inflammation (mastitis)."
    ),
    "milk_drop": (
        "Her milk yield dropped by about {value} litres compared to her "
        "baseline. A sudden drop often accompanies illness or stress."
    ),
    "thi_max": (
        "The Temperature-Humidity Index today reached {value} — "
        "{verdict}. Cattle start feeling heat stress above 78."
    ),
    "heat_load": (
        "The cumulative heat load today is {value}. "
        "{verdict}."
    ),
    "lying_mean": (
        "She spent an average of {value} hours lying down. "
        "{verdict} for a lactating {breed}."
    ),
}

# Breed-specific normal ranges (upper thresholds for warning)
THRESHOLDS = {
    "White Fulani": {
        "body_temp_max": 39.0,
        "conductivity_max": 5.5,
        "rumination_mean_low": 5.0,
        "activity_mean_low": 25,
        "activity_mean_high": 48,
        "activity_night_high": 25,
        "lying_mean_low": 7.0,
        "lying_mean_high": 14.0,
        "thi_stress": 78,
    },
    "HF Cross": {
        "body_temp_max": 39.2,
        "conductivity_max": 5.5,
        "rumination_mean_low": 5.5,
        "activity_mean_low": 28,
        "activity_mean_high": 50,
        "activity_night_high": 28,
        "lying_mean_low": 7.5,
        "lying_mean_high": 13.5,
        "thi_stress": 76,  # HF crosses are more heat-sensitive
    },
}

# Translate numeric confidence (0-100) to words a farmer understands
CONFIDENCE_WORDS = [
    (90, "very confident", "The system is very sure about this."),
    (75, "fairly confident", "The system is fairly sure, but a vet check is still recommended."),
    (60, "moderately confident", "There are some signs, but the picture isn't entirely clear yet."),
    (0,  "cautiously flagged", "The signals are mild — worth watching but don't panic."),
]


def confidence_in_words(pct: int) -> tuple[str, str]:
    """Return (label, sentence) for a confidence percentage."""
    for threshold, label, sentence in CONFIDENCE_WORDS:
        if pct >= threshold:
            return label, sentence
    return CONFIDENCE_WORDS[-1][1], CONFIDENCE_WORDS[-1][2]


def _baselines(df: pd.DataFrame) -> pd.DataFrame:
    """Per-animal baseline mean/std from that animal's healthy-ish first window."""
    base = df[df["day"] < 14]  # early baseline period
    agg = base.groupby("animal_id").agg(
        rum_base=("rumination_min", "mean"),
        act_base=("activity_index", "mean"),
        temp_base=("body_temp_c", "mean"),
        cond_base=("milk_conductivity", "mean"),
        milk_base=("milk_yield_l", lambda s: s[s > 0].mean() if (s > 0).any() else 0),
    ).reset_index()
    return agg


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return one engineered row per (animal_id, day) with FEATURES + label + meta."""
    base = _baselines(df)
    bmap = base.set_index("animal_id")

    rows = []
    for (aid, day), g in df.groupby(["animal_id", "day"]):
        b = bmap.loc[aid]
        night = g[g["step"].isin(NIGHT_STEPS)]
        milk_today = g.loc[g["milk_yield_l"] > 0, "milk_yield_l"].sum()
        milk_base_day = (b["milk_base"] * 2) if b["milk_base"] else 1.0  # ~2 milkings

        # daily label: estrus dominates, else any at-risk reading, else healthy
        labels = set(g["label"])
        if "In Estrus" in labels:
            label = "In Estrus"
        elif "At Risk" in labels:
            label = "At Risk"
        else:
            label = "Healthy"

        rows.append({
            "animal_id": aid, "breed": g["breed"].iloc[0], "day": int(day),
            "rumination_mean": g["rumination_min"].mean(),
            "rumination_drop": b["rum_base"] - g["rumination_min"].mean(),  # +ve = dropped
            "body_temp_max": g["body_temp_c"].max(),
            "body_temp_var": g["body_temp_c"].var(),
            "activity_mean": g["activity_index"].mean(),
            "activity_night": night["activity_index"].mean() if len(night) else 0.0,
            "conductivity_max": g["milk_conductivity"].max(),
            "milk_drop": max(0.0, milk_base_day - milk_today),
            "thi_max": g["thi"].max(),
            "heat_load": max(0.0, g["thi"].max() - 78),
            "lying_mean": g["lying_time_min"].mean(),
            "label": label,
        })
    out = pd.DataFrame(rows)
    return out.fillna(0.0)


if __name__ == "__main__":
    df = pd.read_csv("outputs/raw_sensor_data.csv")
    feats = build_features(df)
    feats.to_csv("outputs/features_daily.csv", index=False)
    print(f"Built {len(feats):,} daily samples · {len(FEATURES)} features.")
    print("\nLabel distribution (daily):")
    print(feats.label.value_counts())
    print("\nFeature sample:")
    print(feats[FEATURES].describe().round(2).T[["mean", "std", "min", "max"]])
