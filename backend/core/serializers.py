"""Turn ORM objects into the camelCase payload the Next.js frontend expects."""
from django.utils import timezone

CLS = {"critical": "crit", "risk": "risk", "estrus": "estr", "healthy": "risk"}


def _alert_block(alert):
    return {
        "title": alert.title,
        "cls": CLS.get(alert.status, "risk"),
        "subtitle": alert.subtitle,
        "when": timezone.localtime(alert.created).strftime("%H:%M"),
        "recommendation": alert.recommendation,
    }


def _timeline(animal, alert):
    items = []
    if alert:
        items.append({"label": alert.title, "when": "Today, "
                      + timezone.localtime(alert.created).strftime("%H:%M"), "status": alert.status})
    if alert and alert.status != "estrus":
        items.append({"label": "In estrus detected", "when": "21 days ago · vet confirmed", "status": "estrus"})
    items.append({"label": "Calved — lactation began",
                  "when": f"{animal.lactation_day} days ago", "status": "healthy"})
    return items


def build_cow(animal, *, detail=False, with_alert=False):
    alert = animal.alerts.filter(resolved=False).first()
    status = alert.status if alert else "healthy"
    data = {
        "id": animal.tag.lower(),
        "tag": animal.tag,
        "name": animal.name,
        "breed": animal.breed,
        "lactationDay": animal.lactation_day,
        "status": status,
        "statusLabel": alert.title if alert else "Healthy",
        "sensorStatus": animal.sensor_status,
    }
    if alert:
        data["confidence"] = alert.confidence
    if alert and (with_alert or detail):
        data["alert"] = _alert_block(alert)
    if detail:
        if alert:
            data["summary"] = alert.summary
            data["reasons"] = alert.reasons
            data["vitals"] = alert.vitals
        data["timeline"] = _timeline(animal, alert)
    return data
