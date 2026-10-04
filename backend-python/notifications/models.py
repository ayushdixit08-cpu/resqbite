import uuid

from django.db import models

from accounts.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ("DONATION_CREATED", "Donation created"),
        ("DONATION_ACCEPTED", "Donation accepted"),
        ("PICKUP_STARTED", "Pickup started"),
        ("FOOD_DELIVERED", "Food delivered"),
        ("DONATION_CANCELLED", "Donation cancelled"),
        ("EXPIRY_REMINDER", "Expiry reminder"),
        ("VOLUNTEER_ASSIGNMENT", "Volunteer assignment"),
        ("EMERGENCY_REQUEST", "Emergency request"),
        ("PICKUP_AVAILABLE", "Pickup available"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read", "created_at"])]
