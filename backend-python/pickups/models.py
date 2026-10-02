from django.db import models

from accounts.models import User
from donations.models import Donation


class PickupTask(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_COMPLETED, "Completed"),
    ]

    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="pickup_tasks")
    volunteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pickup_tasks", null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pickup for {self.donation_id}"
