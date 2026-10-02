import uuid

from django.db import models

from accounts.models import User


class VolunteerProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="volunteer_profile")
    is_available = models.BooleanField(default=True)
    service_radius_km = models.PositiveSmallIntegerField(default=10)
    points = models.PositiveIntegerField(default=0)
    completed_deliveries = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["is_available", "service_radius_km"])]
