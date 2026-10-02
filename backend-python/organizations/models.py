import uuid

from django.db import models

from accounts.models import User


class Organization(models.Model):
    VERIFICATION_PENDING = "PENDING"
    VERIFICATION_VERIFIED = "VERIFIED"
    VERIFICATION_REJECTED = "REJECTED"
    VERIFICATION_CHOICES = [
        (VERIFICATION_PENDING, "Pending"),
        (VERIFICATION_VERIFIED, "Verified"),
        (VERIFICATION_REJECTED, "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="organization")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    registration_document = models.FileField(upload_to="organization_documents/", blank=True, null=True)
    phone = models.CharField(max_length=25, blank=True, default="")
    website = models.URLField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    food_preferences = models.JSONField(default=list, blank=True)
    capacity = models.PositiveIntegerField(default=0)
    current_demand = models.PositiveIntegerField(default=0)
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default=VERIFICATION_PENDING)
    response_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["verification_status", "created_at"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

    def __str__(self):
        return self.name

    @property
    def is_verified(self):
        return self.verification_status == self.VERIFICATION_VERIFIED
