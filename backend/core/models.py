from django.db import models

class Farm(models.Model):
    name = models.CharField(max_length=120)
    owner = models.CharField(max_length=120)
    region = models.CharField(max_length=60)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Animal(models.Model):
    """A cow. One-to-many to sensor readings and alerts."""
    tag = models.CharField(max_length=20, unique=True)        # NG-014
    name = models.CharField(max_length=60)
    breed = models.CharField(max_length=60)                   # White Fulani / HF Cross
    birth_year = models.IntegerField(default=2021)
    lactation_day = models.IntegerField(default=0)
    farm = models.ForeignKey(Farm, related_name="animals", null=True, blank=True, on_delete=models.CASCADE)
    herd = models.CharField(max_length=20, default="B")
    base_rumination = models.FloatField(default=6.0)  # animal's own baseline, for ingest scoring
    sensor_status = models.CharField(max_length=20, default="active")  # 'active' or 'pending'

    class Meta:
        ordering = ["tag"]

    def __str__(self):
        return f"{self.tag} · {self.name}"


class SensorReading(models.Model):
    """A 15-minute multi-sensor reading. Idempotent on (animal, timestamp)."""
    animal = models.ForeignKey(Animal, related_name="readings", on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    activity_index = models.FloatField(default=0)
    rumination_min = models.FloatField(default=0)
    body_temp_c = models.FloatField(default=0)
    milk_yield_l = models.FloatField(default=0)
    milk_conductivity = models.FloatField(default=0)
    lying_time_min = models.FloatField(default=0)
    thi = models.FloatField(default=0)
    event = models.CharField(max_length=12, blank=True, default="")  # '', risk, critical, estrus

    class Meta:
        unique_together = ("animal", "timestamp")
        ordering = ["-timestamp"]


class Alert(models.Model):
    """A model prediction worth surfacing, with its SHAP explanation."""
    STATUS = [("healthy", "Healthy"), ("risk", "At risk"),
              ("critical", "Critical"), ("estrus", "In estrus")]
    animal = models.ForeignKey(Animal, related_name="alerts", on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=12, choices=STATUS)
    title = models.CharField(max_length=80)
    subtitle = models.CharField(max_length=160, blank=True)
    summary = models.TextField(blank=True)            # plain-language banner
    recommendation = models.TextField(blank=True)
    confidence = models.IntegerField(default=0)       # 0..100
    reasons = models.JSONField(default=list)          # SHAP: [{label, weight, direction}]
    vitals = models.JSONField(default=list)           # [{label, value, tone, trend}]
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created"]


class Diagnosis(models.Model):
    """Vet ground truth — feeds model retraining."""
    animal = models.ForeignKey(Animal, related_name="diagnoses", on_delete=models.CASCADE)
    alert = models.ForeignKey(Alert, null=True, blank=True, on_delete=models.SET_NULL)
    actual_label = models.CharField(max_length=40)    # confirmed / false_alarm / custom
    notes = models.TextField(blank=True)
    vet_name = models.CharField(max_length=60, default="Dr. Bello")
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created"]
