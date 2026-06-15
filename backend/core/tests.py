from django.core.management import call_command
from rest_framework.test import APITestCase


class APISmokeTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_herd")

    def test_health_ok(self):
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ok")

    def test_herd_populated(self):
        self.assertEqual(self.client.get("/api/cows").json().__len__(), 40)

    def test_summary_adds_up(self):
        s = self.client.get("/api/herd/summary").json()
        self.assertEqual(s["healthy"] + s["risk"] + s["estrus"], s["total"])

    def test_hero_has_shap_reasons(self):
        d = self.client.get("/api/cows/ng-014").json()
        self.assertTrue(any(r["direction"] == "rules-out" for r in d["reasons"]))

    def test_history_series(self):
        h = self.client.get("/api/cows/ng-014/history").json()
        self.assertIn("rumination", h["series"])
        self.assertTrue(len(h["days"]) > 10)

    def test_diagnosis_resolves_alert(self):
        before = self.client.get("/api/herd/summary").json()["risk"]
        self.client.post("/api/cows/ng-014/diagnosis", {"actual_label": "confirmed"}, format="json")
        after = self.client.get("/api/herd/summary").json()["risk"]
        self.assertLess(after, before)


class IngestTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_herd")

    def _batch(self, tag="NG-001"):
        import datetime as dt, math, random
        random.seed(3)
        base = dt.datetime(2025, 3, 1, 0, 0)
        rows = []
        for i in range(96):
            ts = base + dt.timedelta(minutes=15 * i)
            di = 0.5 + 0.5 * math.cos((ts.hour - 13) / 24 * 2 * math.pi)
            rows.append({
                "animal_tag": tag, "timestamp": ts.isoformat(),
                "activity_index": round(max(0, 18 + 13 * di + random.uniform(-3, 3)), 2),
                "rumination_min": round(max(0, 4.2 + random.uniform(-0.6, 0.6)), 2),
                "body_temp_c": round(39.4 + 0.7 * di + random.uniform(-0.1, 0.1), 2),
                "milk_yield_l": 4.5 if i in (28, 76) else 0.0,
                "milk_conductivity": round(7.2 + random.uniform(-0.3, 0.3), 2),
                "lying_time_min": round(10 + random.uniform(-1, 1), 2),
                "thi": round(74 + random.uniform(-1, 1), 1),
            })
        return {"readings": rows}

    def test_ingest_is_idempotent(self):
        from core.models import SensorReading
        before = SensorReading.objects.count()
        self.client.post("/api/ingest", self._batch(), format="json")
        after_first = SensorReading.objects.count()
        self.client.post("/api/ingest", self._batch(), format="json")  # re-send
        after_second = SensorReading.objects.count()
        self.assertEqual(after_first - before, 96)
        self.assertEqual(after_second, after_first)  # no duplicates

    def test_ingest_scores_and_alerts(self):
        r = self.client.post("/api/ingest?score=1", self._batch("NG-001"), format="json").json()
        self.assertTrue(any(a["title"] for a in r["new_alerts"]))

    def test_ingest_flags_unknown_animal(self):
        b = self._batch("NG-999")
        r = self.client.post("/api/ingest", b, format="json").json()
        self.assertIn("NG-999", r["unknown_animals"])
