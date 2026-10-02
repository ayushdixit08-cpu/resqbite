from django.db import models

from donations.models import Donation


class TrackingEvent(models.Model):
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="tracking_events")
    status = models.CharField(max_length=50)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.donation_id} - {self.status}"
