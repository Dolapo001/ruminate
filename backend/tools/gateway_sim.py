"""
gateway_sim.py — simulates a farm gateway doing store-and-forward.

Generates a day of 15-minute readings for one animal (a mastitis-like day),
POSTs them to /api/ingest?score=1, then POSTS THE SAME BATCH AGAIN to prove the
server dedupes (idempotency) — exactly what happens when a buffered batch is
re-sent after the network drops.

    python tools/gateway_sim.py            # against http://localhost:8000
    python tools/gateway_sim.py NG-007 http://localhost:8000
"""
import json, sys, urllib.request, datetime as dt, math, random

TAG = sys.argv[1] if len(sys.argv) > 1 else "NG-007"
BASE = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000"
random.seed(7)


def make_day():
    start = dt.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    readings = []
    for step in range(96):
        ts = start + dt.timedelta(minutes=15 * step)
        di = 0.5 + 0.5 * math.cos((ts.hour - 13) / 24 * 2 * math.pi)
        readings.append({
            "animal_tag": TAG, "timestamp": ts.isoformat(),
            "activity_index": round(max(0, 18 + 13 * di + random.uniform(-3, 3)), 2),   # reduced (sick)
            "rumination_min": round(max(0, 4.2 + random.uniform(-0.6, 0.6)), 2),         # depressed
            "body_temp_c": round(39.4 + 0.7 * di + random.uniform(-0.1, 0.1), 2),        # fever
            "milk_yield_l": 4.5 if step in (28, 76) else 0.0,
            "milk_conductivity": round(7.2 + random.uniform(-0.3, 0.3), 2),              # high (mastitis)
            "lying_time_min": round(10 + random.uniform(-1, 1), 2),
            "thi": round(74 + random.uniform(-1, 1), 1),                                 # mild weather
        })
    return readings


def post(readings):
    body = json.dumps({"readings": readings}).encode()
    req = urllib.request.Request(f"{BASE}/api/ingest?score=1", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


if __name__ == "__main__":
    day = make_day()
    print(f"Gateway: sending {len(day)} readings for {TAG} ...")
    r1 = post(day)
    print("  first send :", {k: r1[k] for k in ("created", "updated", "new_alerts")})
    print("Gateway: network blip — re-sending the SAME buffered batch ...")
    r2 = post(day)
    print("  re-send    :", {k: r2[k] for k in ("created", "updated", "new_alerts")})
    print("\nIdempotent ✓  — re-send created 0 new rows, updated in place." if r2["created"] == 0
          else "\nWARNING: re-send created new rows (not idempotent)")
