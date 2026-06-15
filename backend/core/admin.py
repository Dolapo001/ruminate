from django.contrib import admin
from .models import Animal, SensorReading, Alert, Diagnosis

admin.site.register([Animal, SensorReading, Alert, Diagnosis])
