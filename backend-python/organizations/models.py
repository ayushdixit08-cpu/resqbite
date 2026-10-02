from django.db import models

from accounts.models import User


class Organization(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="organization")
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=255, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=25, blank=True, default="")
    website = models.URLField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
