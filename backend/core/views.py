"""API endpoints. Shapes mirror the frontend's Cow/Alert types exactly."""
import json
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Animal, Alert, Diagnosis, Farm
from .serializers import build_cow

URGENCY = {"critical": 0, "risk": 1, "estrus": 2}


@api_view(["GET"])
def herd_summary(request):
    animals = Animal.objects.all()
    total = animals.count()
    alerts = Alert.objects.filter(resolved=False)
    risk = alerts.filter(status__in=["risk", "critical"]).values("animal").distinct().count()
    estrus = alerts.filter(status="estrus").values("animal").distinct().count()
    healthy = total - risk - estrus
    return Response({"healthy": healthy, "risk": risk, "estrus": estrus, "total": total})


@api_view(["GET"])
def cow_list(request):
    queryset = Animal.objects.all()
    q = request.query_params.get("q", "").strip()
    farm_id = request.query_params.get("farm_id")
    if q:
        from django.db.models import Q
        queryset = queryset.filter(Q(tag__icontains=q) | Q(name__icontains=q))
    if farm_id:
        queryset = queryset.filter(farm_id=farm_id)
    return Response([build_cow(a) for a in queryset])

@api_view(["POST"])
def create_farm(request):
    name = request.data.get("name")
    owner = request.data.get("owner")
    region = request.data.get("region")
    if not all([name, owner, region]):
        return Response({"error": "Missing fields"}, status=400)
    farm = Farm.objects.create(name=name, owner=owner, region=region)
    return Response({"id": farm.id, "name": farm.name}, status=201)

@api_view(["POST"])
def create_animal(request):
    tag = request.data.get("tag")
    name = request.data.get("name")
    breed = request.data.get("breed", "White Fulani")
    lactation_day = int(request.data.get("lactation_day", 0))
    farm_id = request.data.get("farm_id")
    
    if not tag or not name:
        return Response({"error": "Tag and name required"}, status=400)
        
    farm = Farm.objects.filter(id=farm_id).first() if farm_id else None
    
    animal = Animal.objects.create(
        tag=tag,
        name=name,
        breed=breed,
        lactation_day=lactation_day,
        farm=farm,
        sensor_status="pending"
    )
    return Response(build_cow(animal), status=201)

@api_view(["POST"])
def simulate_sensor(request, cow_id):
    animal = get_object_or_404(Animal, tag__iexact=cow_id)
    if animal.sensor_status == "active":
        return Response({"message": "Already active"}, status=400)
        
    import sys
    import os
    sys.path.append(os.path.join(settings.BASE_DIR.parent, "ai"))
    from generate_data import generate_animal
    import datetime as dt
    from django.utils import timezone
    from .models import SensorReading
    from . import ml
    
    rows = generate_animal(animal.tag, animal.breed, n_days=15)
    base = timezone.now() - dt.timedelta(days=1)
    batch = []
    touched = []
    
    for r in rows:
        day = int(r["day"])
        step = int(r["step"])
        ts = base - dt.timedelta(days=(15 - day)) + dt.timedelta(minutes=15 * step)
        
        rdg = SensorReading(
            animal=animal,
            timestamp=ts,
            activity_index=r["activity_index"],
            rumination_min=r["rumination_min"],
            body_temp_c=r["body_temp_c"],
            milk_conductivity=r["milk_conductivity"],
            thi=r["thi"],
            event=""
        )
        batch.append(rdg)
        
        # Collect the last day's readings to score it
        if day == 14:
            touched.append({
                "activity_index": r["activity_index"],
                "rumination_min": r["rumination_min"],
                "body_temp_c": r["body_temp_c"],
                "milk_conductivity": r["milk_conductivity"],
                "thi": r["thi"],
                "hour": ts.hour
            })
            
    SensorReading.objects.bulk_create(batch, batch_size=1000)
    
    # Run the model on the generated data
    feats = ml.aggregate_day(touched, base_rumination=animal.base_rumination,
                             breed=animal.breed, lactation_day=animal.lactation_day)
    a = ml.build_assessment(feats)
    if a["is_alert"]:
        Alert.objects.create(
            animal=animal, status=a["status"], title=a["title"], subtitle=a["subtitle"],
            summary=a["summary"], recommendation=a["recommendation"], confidence=a["confidence"],
            reasons=a["reasons"], vitals=a["vitals"]
        )
        
    animal.sensor_status = "active"
    animal.save()
    
    return Response(build_cow(animal, detail=True))


@api_view(["GET"])
def cow_detail(request, cow_id):
    animal = get_object_or_404(Animal, tag__iexact=cow_id)
    return Response(build_cow(animal, detail=True))


@api_view(["GET"])
def alerts_list(request):
    cows = []
    for alert in Alert.objects.filter(resolved=False).select_related("animal"):
        cows.append((alert.status, build_cow(alert.animal, with_alert=True)))
    cows.sort(key=lambda t: URGENCY.get(t[0], 9))
    return Response([c for _, c in cows])


@api_view(["GET"])
def alert_detail(request, cow_id):
    animal = get_object_or_404(Animal, tag__iexact=cow_id)
    return Response(build_cow(animal, detail=True))


@api_view(["POST"])
def diagnosis_create(request, cow_id):
    animal = get_object_or_404(Animal, tag__iexact=cow_id)
    alert = animal.alerts.filter(resolved=False).first()
    d = Diagnosis.objects.create(
        animal=animal, alert=alert,
        actual_label=request.data.get("actual_label", "confirmed"),
        notes=request.data.get("notes", ""),
        vet_name=request.data.get("vet_name", "Dr. Bello"),
    )
    if alert:
        alert.resolved = True
        alert.save(update_fields=["resolved"])
    return Response({"ok": True, "id": d.id,
                     "message": "Diagnosis logged — added to training data."}, status=201)


@api_view(["GET"])
def cow_history(request, cow_id):
    """Daily sensor history for the trend charts, with event markers."""
    animal = get_object_or_404(Animal, tag__iexact=cow_id)
    rows = list(animal.readings.order_by("timestamp"))
    rows = rows[-45:]  # last ~45 days
    days = list(range(len(rows)))
    series = {
        "rumination": [round(r.rumination_min, 2) for r in rows],
        "body_temp": [round(r.body_temp_c, 2) for r in rows],
        "activity": [round(r.activity_index, 1) for r in rows],
        "conductivity": [round(r.milk_conductivity, 2) for r in rows],
    }
    events = [{"day": i, "status": r.event} for i, r in enumerate(rows) if r.event]
    return Response({"days": days, "series": series, "events": events})


@api_view(["POST"])
def ingest(request):
    """Store-and-forward receiver for the farm gateway.

    Accepts a batch of raw 15-minute readings and is IDEMPOTENT on
    (animal, timestamp) — re-sending a buffered batch after a network outage
    updates in place instead of duplicating. With ?score=1 it also aggregates
    each animal's latest day and re-scores it with the model (closing the loop).
    """
    import datetime as dt
    from django.utils.dateparse import parse_datetime
    from collections import defaultdict
    from .models import SensorReading
    from . import ml

    payload = request.data.get("readings", [])
    if not isinstance(payload, list):
        return Response({"error": "expected {'readings': [...]}"}, status=400)

    by_tag = {a.tag: a for a in Animal.objects.all()}
    created = updated = 0
    unknown = set()
    touched = defaultdict(list)  # animal -> list of reading dicts (for scoring)

    for r in payload:
        tag = r.get("animal_tag")
        animal = by_tag.get(tag)
        if not animal:
            unknown.add(tag); continue
        ts = parse_datetime(r.get("timestamp", "")) if r.get("timestamp") else None
        if ts is None:
            continue
        _, was_created = SensorReading.objects.update_or_create(
            animal=animal, timestamp=ts,
            defaults={
                "activity_index": r.get("activity_index", 0), "rumination_min": r.get("rumination_min", 0),
                "body_temp_c": r.get("body_temp_c", 0), "milk_yield_l": r.get("milk_yield_l", 0),
                "milk_conductivity": r.get("milk_conductivity", 0), "lying_time_min": r.get("lying_time_min", 0),
                "thi": r.get("thi", 0),
            },
        )
        created += was_created
        updated += (not was_created)
        touched[animal].append({**r, "hour": ts.hour})

    new_alerts = []
    if request.query_params.get("score") == "1":
        for animal, readings in touched.items():
            feats = ml.aggregate_day(readings, base_rumination=animal.base_rumination,
                                     breed=animal.breed, lactation_day=animal.lactation_day)
            a = ml.build_assessment(feats)
            animal.alerts.filter(resolved=False).update(resolved=True)
            if a["is_alert"]:
                Alert.objects.create(
                    animal=animal, status=a["status"], title=a["title"], subtitle=a["subtitle"],
                    summary=a["summary"], recommendation=a["recommendation"], confidence=a["confidence"],
                    reasons=a["reasons"], vitals=a["vitals"],
                )
                new_alerts.append({"animal": animal.tag, "title": a["title"], "confidence": a["confidence"]})

    return Response({
        "received": len(payload), "created": created, "updated": updated,
        "deduped": updated, "unknown_animals": sorted(unknown), "new_alerts": new_alerts,
    }, status=201)


@api_view(["GET"])
def health(request):
    from .ml import _model  # ensures the model loads
    ok = _model() is not None
    return Response({"status": "ok" if ok else "degraded",
                     "animals": Animal.objects.count(),
                     "open_alerts": Alert.objects.filter(resolved=False).count()})


@api_view(["GET"])
def metrics(request):
    return Response(json.load(open(settings.ML_DIR / "metrics.json")))


@api_view(["POST"])
def auth_login(request):
    # demo stub: any phone/code works, returns a token-shaped string
    return Response({"token": "demo-token", "role": "vet", "name": "Dr. Bello"})


@api_view(["GET"])
def counterfactual(request, cow_id):
    """What-if analysis: show how the prediction changes under different weather.

    Returns the model's risk probability under the current weather vs a
    hypothetical hot day (THI 90, heat_load 12). If the prediction stays
    the same, heat is ruled out — this is the thesis's centrepiece.
    """
    from . import ml
    animal = get_object_or_404(Animal, tag__iexact=cow_id)
    alert = animal.alerts.filter(resolved=False).first()
    if not alert or not alert.reasons:
        return Response({"available": False})

    # Reconstruct the feature dict from the alert's stored vitals/reasons
    # by re-running the model with the current snapshot
    import csv
    path = settings.ML_DIR / "herd_current.csv"
    row = None
    for r in csv.DictReader(open(path)):
        if r["animal_id"].lower() == cow_id.lower():
            row = r
            break
    if not row:
        return Response({"available": False})

    feats = {k: float(v) for k, v in row.items() if k in ml.FEATURES}

    # Current prediction
    current_proba = ml._model().predict_proba(ml._vec(feats))[0]
    current_label = ml.CLASSES[int(current_proba.argmax())]

    # Hot counterfactual
    hot_feats = {**feats, "thi_max": 90.0, "heat_load": 12.0}
    hot_proba = ml._model().predict_proba(ml._vec(hot_feats))[0]
    hot_label = ml.CLASSES[int(hot_proba.argmax())]

    # Cool counterfactual
    cool_feats = {**feats, "thi_max": 72.0, "heat_load": 0.0}
    cool_proba = ml._model().predict_proba(ml._vec(cool_feats))[0]
    cool_label = ml.CLASSES[int(cool_proba.argmax())]

    def fmt_proba(p):
        return {ml.CLASSES[i]: int(round(float(p[i]) * 100)) for i in range(len(ml.CLASSES))}

    heat_ruled_out = (hot_label == current_label)

    return Response({
        "available": True,
        "current": {
            "thi": round(feats.get("thi_max", 0), 1),
            "heat_load": round(feats.get("heat_load", 0), 1),
            "label": current_label,
            "probabilities": fmt_proba(current_proba),
        },
        "hot": {
            "thi": 90.0, "heat_load": 12.0,
            "label": hot_label,
            "probabilities": fmt_proba(hot_proba),
        },
        "cool": {
            "thi": 72.0, "heat_load": 0.0,
            "label": cool_label,
            "probabilities": fmt_proba(cool_proba),
        },
        "heat_ruled_out": heat_ruled_out,
        "insight": (
            "Prediction holds even in hot weather — heat is NOT the cause. This is genuine disease."
            if heat_ruled_out else
            "Prediction changes with weather — heat stress may be a factor."
        ),
    })


@api_view(["GET"])
def explain(request, cow_id):
    """Layman-friendly explanation of the AI prediction.

    Returns plain-language sentences, per-factor detail with severity and
    normal ranges, confidence in words, heat analysis, and an actionable
    bottom-line — all phrased so a farmer (not a data scientist) can
    understand why the system flagged this animal.
    """
    from . import ml
    import csv
    animal = get_object_or_404(Animal, tag__iexact=cow_id)
    alert = animal.alerts.filter(resolved=False).first()

    # Try to load the feature row from herd_current.csv
    path = settings.ML_DIR / "herd_current.csv"
    row = None
    try:
        for r in csv.DictReader(open(path)):
            if r["animal_id"].lower() == cow_id.lower():
                row = r
                break
    except FileNotFoundError:
        pass

    if not row:
        return Response({"available": False})

    feats = {k: float(v) for k, v in row.items() if k in ml.FEATURES}
    narrative = ml.generate_narrative(feats, name=animal.name, breed=animal.breed)
    return Response(narrative)


@api_view(["GET"])
def herd_analytics(request):
    """Aggregated herd-level stats for the analytics dashboard."""
    from collections import Counter
    from .models import SensorReading

    animals = Animal.objects.all()
    alerts = Alert.objects.filter(resolved=False)

    # Breed breakdown
    breeds = Counter(a.breed for a in animals)
    breed_health = {}
    for breed in breeds:
        breed_animals = [a for a in animals if a.breed == breed]
        breed_ids = {a.id for a in breed_animals}
        at_risk = alerts.filter(animal_id__in=breed_ids, status__in=["risk", "critical"]).count()
        estrus = alerts.filter(animal_id__in=breed_ids, status="estrus").count()
        breed_health[breed] = {
            "total": len(breed_animals),
            "healthy": len(breed_animals) - at_risk - estrus,
            "risk": at_risk,
            "estrus": estrus,
        }

    # Daily herd health trend (last 45 days from sensor history)
    import datetime as dt
    from django.utils import timezone
    from django.db.models import Count, Q

    # Get daily event counts from sensor readings
    readings = SensorReading.objects.order_by("timestamp")
    if readings.exists():
        latest = readings.last().timestamp
        earliest = latest - dt.timedelta(days=45)
        daily = (
            readings
            .filter(timestamp__gte=earliest)
            .extra(select={"day": "DATE(timestamp)"})
            .values("day")
            .annotate(
                total=Count("id"),
                risk_events=Count("id", filter=Q(event="risk")),
                estrus_events=Count("id", filter=Q(event="estrus")),
            )
            .order_by("day")
        )
        trend = [
            {
                "day": str(d["day"]),
                "total": d["total"],
                "risk": d["risk_events"],
                "estrus": d["estrus_events"],
                "healthy": d["total"] - d["risk_events"] - d["estrus_events"],
            }
            for d in daily
        ]
    else:
        trend = []

    # Alert type distribution
    alert_types = Counter(a.status for a in alerts)

    # Diagnosis stats
    from .models import Diagnosis
    total_diagnoses = Diagnosis.objects.count()
    confirmed = Diagnosis.objects.filter(actual_label="confirmed").count()
    false_alarms = Diagnosis.objects.filter(actual_label="false_alarm").count()

    return Response({
        "breed_health": breed_health,
        "trend": trend,
        "alert_distribution": dict(alert_types),
        "diagnoses": {
            "total": total_diagnoses,
            "confirmed": confirmed,
            "false_alarms": false_alarms,
        },
    })

