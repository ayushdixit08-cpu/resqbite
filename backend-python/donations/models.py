from django.db import models

from accounts.models import User
from organizations.models import Organization


class Donation(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_ASSIGNED = "ASSIGNED"
    STATUS_PICKED_UP = "PICKED_UP"
    STATUS_DELIVERED = "DELIVERED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_ASSIGNED, "Assigned"),
        (STATUS_PICKED_UP, "Picked up"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_COMPLETED, "Completed"),
    ]

    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="donations")
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name="donations")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    food_type = models.CharField(max_length=100)
    quantity = models.CharField(max_length=100)
    pickup_address = models.CharField(max_length=255, blank=True, default="")
    pickup_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.status}"
