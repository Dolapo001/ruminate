"""Export a compact per-animal daily history for the backend to seed as
SensorReading rows (one aggregated reading per day) — powers the trend charts."""
import pandas as pd

df = pd.read_csv("outputs/features_daily.csv")
hist = pd.DataFrame({
    "animal_id": df["animal_id"], "day": df["day"],
    "rumination": df["rumination_mean"].round(2),
    "body_temp": df["body_temp_max"].round(2),
    "activity": df["activity_mean"].round(1),
    "conductivity": df["conductivity_max"].round(2),
    "thi": df["thi_max"].round(1),
    "label": df["label"],
}).sort_values(["animal_id", "day"])
hist.to_csv("outputs/herd_history.csv", index=False)
print(f"History: {len(hist)} animal-days for {hist.animal_id.nunique()} animals.")
