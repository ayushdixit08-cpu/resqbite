from datetime import timedelta

from django.utils import timezone

from .models import FraudAlert


def inspect_donation(donation):
    alerts = []
    recent_duplicate = donation.__class__.objects.filter(
        donor=donation.donor,
        food_name__iexact=donation.food_name,
        category=donation.category,
        quantity=donation.quantity,
        created_at__gte=timezone.now() - timedelta(hours=24),
    ).exclude(pk=donation.pk).exists()
    if recent_duplicate:
        alerts.append(("DUPLICATE_DONATION", {"donation_id": str(donation.pk)}))

    cancelled_recently = donation.__class__.objects.filter(
        donor=donation.donor,
        status="CANCELLED",
        updated_at__gte=timezone.now() - timedelta(days=30),
    ).count()
    if cancelled_recently >= 5:
        alerts.append(("REPEATED_CANCELLATIONS", {"count": cancelled_recently}))

    return [
        FraudAlert.objects.create(user=donation.donor, rule=rule, details=details)
        for rule, details in alerts
    ]
