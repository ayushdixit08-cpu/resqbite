import uuid

from django.db import models

from organizations.models import Organization


class EmergencyFoodRequest(models.Model):
    STATUS_OPEN = "OPEN"
    STATUS_MATCHED = "MATCHED"
    STATUS_FULFILLED = "FULFILLED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_MATCHED, "Matched"),
        (STATUS_FULFILLED, "Fulfilled"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="emergency_requests")
    category = models.CharField(max_length=20)
    quantity_required = models.DecimalField(max_digits=10, decimal_places=2)
    people_served = models.PositiveIntegerField()
    urgency = models.PositiveSmallIntegerField(default=3)
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    required_before = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["required_before"]
        indexes = [models.Index(fields=["status", "required_before"])]
