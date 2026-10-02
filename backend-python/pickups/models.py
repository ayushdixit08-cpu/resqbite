import uuid

from django.db import models

from accounts.models import User
from donations.models import Donation
from organizations.models import Organization


class PickupTask(models.Model):
    STATUS_ASSIGNED = "ASSIGNED"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_PICKUP_STARTED = "PICKUP_STARTED"
    STATUS_PICKED_UP = "PICKED_UP"
    STATUS_IN_TRANSIT = "IN_TRANSIT"
    STATUS_DELIVERED = "DELIVERED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (STATUS_ASSIGNED, "Assigned"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_PICKUP_STARTED, "Pickup started"),
        (STATUS_PICKED_UP, "Picked up"),
        (STATUS_IN_TRANSIT, "In transit"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="pickup_tasks")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="pickup_tasks")
    volunteer = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="pickup_tasks", null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_ASSIGNED)
    notes = models.TextField(blank=True, default="")
    pickup_address = models.CharField(max_length=255)
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_address = models.CharField(max_length=255)
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-assigned_at"]
        indexes = [models.Index(fields=["volunteer", "status"]), models.Index(fields=["status", "assigned_at"])]

    def __str__(self):
        return f"Delivery for {self.donation_id}"
