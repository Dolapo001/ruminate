"""Seed the database from the AI snapshot, scoring each animal with the model."""
import csv
from django.conf import settings
from django.core.management.base import BaseCommand
from core.models import Animal, Alert, Diagnosis
from core import ml

NAMES = [
    "Amina", "Zahra", "Ngozi", "Funmi", "Aisha", "Bisi", "Hauwa", "Chika", "Sade", "Rukky",
    "Halima", "Ada", "Yetunde", "Ngozika", "Fatima", "Ireti", "Maryam", "Ebele", "Simi", "Zainab",
    " Topé", "Kemi", "Hadiza", "Nneka", "Folake", "Aishat", "Bukola", "Ramat", "Chioma", "Titi",
    "Asma", "Ngozi II", "Damilola", "Saratu", "Omolara", "Habiba", "Yewande", "Binta", "Funke", "Larai",
]


class Command(BaseCommand):
    help = "Seed animals + alerts from ml_artifacts/herd_current.csv"

    # A representative mild-weather mastitis case (THI normal) so the model's own
    # SHAP surfaces the "rules out heat" factor — the project's thesis, shown live.
    HERO = dict(
        rumination_mean=4.4, rumination_drop=2.4, body_temp_max=39.7, body_temp_var=0.25,
        activity_mean=26, activity_night=10, conductivity_max=7.1, milk_drop=2.6,
        thi_max=76.0, heat_load=0.0, lying_mean=9.0,
    )

    def handle(self, *args, **opts):
        Diagnosis.objects.all().delete()
        Alert.objects.all().delete()
        Animal.objects.all().delete()

        path = settings.ML_DIR / "herd_current.csv"
        rows = list(csv.DictReader(open(path)))

        # deterministic lactation days; nudge a high-activity at-risk cow to calving range
        risk_acts = [(r["animal_id"], float(r["activity_mean"])) for r in rows if r["label"] == "At Risk"]
        calving_id = max(risk_acts, key=lambda t: t[1])[0] if risk_acts else None

        created = 0
        for i, r in enumerate(rows):
            feats = {k: float(v) for k, v in r.items() if k in ml.FEATURES}
            lact = 280 if r["animal_id"] == calving_id else 40 + (i * 37) % 230
            name = NAMES[i % len(NAMES)].strip()
            breed = "HF Cross" if r["breed"] == "Holstein-Friesian Cross" else "White Fulani"

            # hero worked example: NG-014 "Amina" — mild-weather mastitis (rules out heat)
            if r["animal_id"] == "NG-014":
                feats = dict(self.HERO)
                name, breed, lact = "Amina", "White Fulani", 88

            feats["_lactation_day"] = lact

            animal = Animal.objects.create(
                tag=r["animal_id"], name=name, breed=breed, lactation_day=lact, herd="B",
            )

            a = ml.build_assessment(feats)
            if a["is_alert"]:
                Alert.objects.create(
                    animal=animal, status=a["status"], title=a["title"], subtitle=a["subtitle"],
                    summary=a["summary"], recommendation=a["recommendation"], confidence=a["confidence"],
                    reasons=a["reasons"], vitals=a["vitals"],
                )
                created += 1

        n_h = Animal.objects.count() - created
        self._seed_history()
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Animal.objects.count()} animals · {created} alerts · {n_h} healthy."))

    def _seed_history(self):
        """One aggregated SensorReading per animal-day → trend charts."""
        import csv as _csv
        import datetime as _dt
        from django.utils import timezone as _tz
        from core.models import SensorReading

        SensorReading.objects.all().delete()
        path = settings.ML_DIR / "herd_history.csv"
        if not path.exists():
            return
        by_tag = {a.tag: a for a in Animal.objects.all()}
        base = _tz.now() - _dt.timedelta(days=1)
        status_map = {"At Risk": "risk", "In Estrus": "estrus", "Healthy": ""}
        batch = []
        for r in _csv.DictReader(open(path)):
            animal = by_tag.get(r["animal_id"])
            if not animal:
                continue
            day = int(float(r["day"]))
            ts = base - _dt.timedelta(days=(75 - day))
            ev = status_map.get(r["label"], "")
            # surface calving as critical on the hero/late-lactation animals
            batch.append(SensorReading(
                animal=animal, timestamp=ts,
                activity_index=float(r["activity"]), rumination_min=float(r["rumination"]),
                body_temp_c=float(r["body_temp"]), milk_conductivity=float(r["conductivity"]),
                thi=float(r["thi"]), event=ev,
            ))
        SensorReading.objects.bulk_create(batch, batch_size=1000)
        # per-animal baseline (mean rumination over the earliest ~14 days) for ingest scoring
        from collections import defaultdict
        early = defaultdict(list)
        for r in batch:
            if r.timestamp <= base - _dt.timedelta(days=(75 - 14)):
                early[r.animal_id].append(r.rumination_min)
        for animal in Animal.objects.all():
            vals = early.get(animal.id, [])
            if vals:
                animal.base_rumination = round(sum(vals) / len(vals), 2)
                animal.save(update_fields=["base_rumination"])
        self.stdout.write(f"  · {len(batch)} daily readings seeded for trends.")
