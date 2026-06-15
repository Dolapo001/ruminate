"""
generate_data.py
------------------
Synthetic, biologically-plausible sensor data generator for the
"Explainable AI for Sensor-Based Prediction of Health & Reproductive Traits
in Dairy Cows (Nigeria)" project.

Why synthetic?
    No public Nigerian wearable-sensor dairy dataset exists. This generator
    encodes documented physiological relationships so that the ML + XAI
    pipeline can be developed and validated, and is built to be SWAPPABLE:
    drop in a real CSV with the same columns and the rest of the pipeline runs
    unchanged.

Sensors simulated (15-minute resolution, per the Chapter 3 functional reqs):
    activity_index        - accelerometer-derived motion (steps proxy)
    rumination_min        - minutes ruminating in the 15-min window
    body_temp_c           - reticular/body temperature (deg C)
    milk_yield_l          - per-milking yield mapped onto the day
    milk_conductivity     - mastitis-sensitive milk electrical conductivity (mS/cm)
    lying_time_min        - resting time in the window
    thi                   - ambient Temperature-Humidity Index (environment sensor)

Biological events injected:
    ESTRUS        ~21-day cycle: activity spike, rumination dip, small temp rise
    MASTITIS      rumination drop, temp rise, conductivity rise, yield drop
    CALVING       restlessness + pre-calving temp dip then spike
    HEAT_STRESS   high THI -> activity & rumination & yield drop, temp rise
                  (deliberate CONFOUNDER: looks like illness but is environmental,
                   the exact problem the Nigerian-context XAI must disentangle)

Target label (per Chapter 3): one of {Healthy, At Risk, In Estrus}
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

BREEDS = {
    # White Fulani (Bunaji): heat-tolerant, lower yield baseline
    "White Fulani": dict(milk_base=8.0, temp_base=38.6, heat_tolerance=0.45,
                         rumination_base=7.0, activity_base=42),
    # Holstein-Friesian cross: higher yield, more heat-sensitive
    "HF Cross": dict(milk_base=15.0, temp_base=38.5, heat_tolerance=0.85,
                     rumination_base=8.5, activity_base=38),
    "Sokoto Gudali": dict(milk_base=7.5, temp_base=38.7, heat_tolerance=0.40,
                          rumination_base=7.2, activity_base=40),
}

INTERVAL_MIN = 15
STEPS_PER_DAY = 24 * 60 // INTERVAL_MIN          # 96 windows/day
LABELS = ["Healthy", "At Risk", "In Estrus"]


def _diurnal(step_of_day, low, high, peak_hour=13):
    """Smooth day/night curve in [low, high]; peak around midday."""
    hour = (step_of_day * INTERVAL_MIN) / 60.0
    phase = np.cos((hour - peak_hour) / 24.0 * 2 * np.pi)
    return low + (high - low) * (phase + 1) / 2


def _ambient_thi(day, step_of_day):
    """Tropical Nigerian THI: hot afternoons, seasonal drift, occasional heat waves."""
    season = 4.0 * np.sin(day / 60.0 * 2 * np.pi)          # slow seasonal swing
    daily = _diurnal(step_of_day, low=70, high=82, peak_hour=15)
    noise = RNG.normal(0, 1.2)
    return daily + season + noise


def generate_animal(animal_id, breed, n_days=75):
    p = BREEDS[breed]
    rows = []

    # estrus cycle: first heat at a random offset, ~21-day period, lasts ~15h
    cycle_len = int(RNG.normal(21, 1.5))
    next_estrus_day = int(RNG.integers(3, 12))

    # one possible mastitis episode and one possible calving for some animals
    mastitis_day = int(RNG.integers(15, n_days - 5)) if RNG.random() < 0.55 else -1
    mastitis_len = int(RNG.integers(2, 5))
    mastitis_sev = RNG.uniform(0.5, 1.15)  # subclinical..clinical
    calving_day = int(RNG.integers(20, n_days - 5)) if RNG.random() < 0.30 else -1

    for day in range(n_days):
        # is this an estrus day?
        in_estrus_day = False
        if day >= next_estrus_day:
            in_estrus_day = True
            next_estrus_day += cycle_len

        for s in range(STEPS_PER_DAY):
            thi = _ambient_thi(day, s)
            heat_load = max(0.0, thi - 78) * p["heat_tolerance"]   # >78 THI = stress
            heat_stress = heat_load > 2.0

            # --- baselines + diurnal pattern + noise ---
            activity = _diurnal(s, low=p["activity_base"] * 0.3, high=p["activity_base"] * 1.4) \
                + RNG.normal(0, 7)
            rumination = _diurnal(s, low=p["rumination_base"] * 0.4,
                                  high=p["rumination_base"] * 1.1, peak_hour=2) \
                + RNG.normal(0, 1.1)
            body_temp = p["temp_base"] + (_diurnal(s, -0.15, 0.35)) + RNG.normal(0, 0.13)
            lying = max(0, 15 - rumination * 0.6 - activity * 0.05 + RNG.normal(0, 1.2))
            conductivity = RNG.normal(4.8, 0.2)
            milk = p["milk_base"] / 2.0 if s in (28, 76) else 0.0   # ~2 milkings/day

            # --- heat stress effect (environmental confounder) ---
            if heat_stress:
                activity -= heat_load * 4.4
                rumination -= heat_load * 0.55
                body_temp += heat_load * 0.26
                milk *= max(0.45, 1 - heat_load * 0.06)

            label = "Healthy"

            # --- estrus window (~15h on the estrus day) ---
            if in_estrus_day and 16 <= s <= 76:
                activity += RNG.normal(20, 9)        # large activity spike
                rumination -= RNG.normal(1.2, 0.7)   # rumination dip
                body_temp += RNG.normal(0.16, 0.09)
                lying = max(0, lying - 4)
                label = "In Estrus"

            # --- mastitis episode ---
            if mastitis_day >= 0 and mastitis_day <= day < mastitis_day + mastitis_len:
                sev = mastitis_sev
                rumination -= RNG.normal(1.5, 0.7) * sev
                body_temp += RNG.normal(0.45, 0.18) * sev
                conductivity += RNG.normal(1.0, 0.4) * sev
                activity -= RNG.normal(4, 2.5) * sev
                milk *= (1 - 0.22 * sev)
                label = "At Risk"

            # --- calving day (counts as At Risk: needs attention) ---
            if calving_day >= 0 and day == calving_day:
                if s < 40:
                    body_temp -= RNG.normal(0.5, 0.1)   # pre-calving temp dip
                activity += RNG.normal(13, 7)            # restlessness
                rumination -= RNG.normal(1.7, 0.7)
                label = "At Risk"

            rows.append(dict(
                animal_id=animal_id, breed=breed, day=day, step=s,
                activity_index=round(max(0, activity), 2),
                rumination_min=round(np.clip(rumination, 0, 15), 2),
                body_temp_c=round(body_temp, 2),
                milk_yield_l=round(max(0, milk), 2),
                milk_conductivity=round(max(3.5, conductivity), 2),
                lying_time_min=round(np.clip(lying, 0, 15), 2),
                thi=round(thi, 1),
                label=label,
            ))
    return rows


def generate_herd(n_animals=300, n_days=75):
    all_rows = []
    for i in range(n_animals):
        breed = "White Fulani" if i % 2 == 0 else "Holstein-Friesian Cross"
        all_rows.extend(generate_animal(f"NG-{i+1:03d}", breed, n_days))
    df = pd.DataFrame(all_rows)
    # timestamp for realism
    df["timestamp"] = pd.to_datetime("2025-01-01") + pd.to_timedelta(
        df["day"] * 24 * 60 + df["step"] * INTERVAL_MIN, unit="m")
    return df


if __name__ == "__main__":
    df = generate_herd()
    df.to_csv("outputs/raw_sensor_data.csv", index=False)
    print(f"Generated {len(df):,} readings for {df.animal_id.nunique()} animals "
          f"over {df.day.nunique()} days.")
    print("\nLabel distribution (raw 15-min readings):")
    print(df.label.value_counts())
    print("\nSample:")
    print(df.head(3).to_string(index=False))
