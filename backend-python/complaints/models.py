import uuid

from django.db import models

from accounts.models import User
from donations.models import Donation


class Complaint(models.Model):
    STATUS_OPEN = "OPEN"
    STATUS_IN_REVIEW = "IN_REVIEW"
    STATUS_RESOLVED = "RESOLVED"
    STATUS_DISMISSED = "DISMISSED"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_IN_REVIEW, "In review"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_DISMISSED, "Dismissed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="complaints")
    donation = models.ForeignKey(Donation, on_delete=models.SET_NULL, null=True, blank=True, related_name="complaints")
    reported_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reported_complaints")
    category = models.CharField(max_length=40)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    resolution_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]


class FraudAlert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fraud_alerts")
    rule = models.CharField(max_length=80)
    details = models.JSONField(default=dict)
    reviewed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
