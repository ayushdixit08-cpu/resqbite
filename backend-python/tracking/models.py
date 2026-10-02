import uuid

from django.db import models

from accounts.models import User
from donations.models import Donation


class TrackingEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="tracking_events")
    status = models.CharField(max_length=50)
    notes = models.TextField(blank=True, default="")
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="tracking_events")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["donation", "created_at"])]

    def __str__(self):
        return f"{self.donation_id} - {self.status}"


class VolunteerLocation(models.Model):
    volunteer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="latest_location")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    updated_at = models.DateTimeField(auto_now=True)
