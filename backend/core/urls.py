from django.urls import path
from . import views

urlpatterns = [
    path("health", views.health),
    path("ingest", views.ingest),
    path("herd/summary", views.herd_summary),
    path("cows", views.cow_list),
    path("cows/new", views.create_animal),
    path("cows/<str:cow_id>", views.cow_detail),
    path("cows/<str:cow_id>/history", views.cow_history),
    path("cows/<str:cow_id>/diagnosis", views.diagnosis_create),
    path("alerts", views.alerts_list),
    path("alerts/<str:cow_id>", views.alert_detail),
    path("cows/<str:cow_id>/counterfactual", views.counterfactual),
    path("cows/<str:cow_id>/explain", views.explain),
    path("farms", views.create_farm),
    path("cows/<str:cow_id>/simulate", views.simulate_sensor),
    path("metrics", views.metrics),
    path("analytics", views.herd_analytics),
    path("auth/login", views.auth_login),
]
