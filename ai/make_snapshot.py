"""
make_snapshot.py
----------------
Simulates one realistic "this morning": picks a single recent day on which the
herd has a believable handful of events (most cows healthy, a few At Risk / In
Estrus), and writes every animal's feature row for that day. The Django backend
seeds Animals + scores them to create Alerts from this snapshot.
"""
import pandas as pd

df = pd.read_csv("outputs/features_daily.csv")
maxday = df["day"].max()

best_day, best_score = maxday, -1
for d in range(maxday, max(maxday - 18, 0), -1):
    day = df[df["day"] == d]
    n_risk = (day["label"] == "At Risk").sum()
    n_estr = (day["label"] == "In Estrus").sum()
    total = n_risk + n_estr
    # prefer a day with ~15-35 events and at least one of each
    score = -abs(total - 25) + (2 if n_risk >= 1 else 0) + (2 if n_estr >= 1 else 0)
    if score > best_score:
        best_score, best_day = score, d

snap = df[df["day"] == best_day].sort_values("animal_id").reset_index(drop=True)
snap.to_csv("outputs/herd_current.csv", index=False)
print(f"Snapshot day {best_day}: {len(snap)} animals")
print(snap["label"].value_counts())
