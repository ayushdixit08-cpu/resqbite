import uuid

from django.db import models

from accounts.models import User


class Event(models.Model):
    STATUS_SCHEDULED = "SCHEDULED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_COMPLETED, "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="events")
    name = models.CharField(max_length=200)
    event_date = models.DateTimeField()
    expected_food_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    pickup_time = models.DateTimeField()
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    instructions = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
