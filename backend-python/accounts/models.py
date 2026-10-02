import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ROLE_DONOR = "DONOR"
    ROLE_NGO = "NGO"
    ROLE_VOLUNTEER = "VOLUNTEER"
    ROLE_ADMIN = "ADMIN"
    ROLE_CHOICES = [
        (ROLE_DONOR, "Donor"),
        (ROLE_NGO, "NGO"),
        (ROLE_VOLUNTEER, "Volunteer"),
        (ROLE_ADMIN, "Admin"),
    ]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, default="")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_DONOR)
    profile_image = models.ImageField(upload_to="profile_images/", blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["role", "is_active"])]

    def __str__(self):
        return f"{self.name} <{self.email}>"

    @property
    def is_ngo(self):
        return self.role == self.ROLE_NGO

    @property
    def is_volunteer(self):
        return self.role == self.ROLE_VOLUNTEER

    @property
    def is_donor(self):
        return self.role == self.ROLE_DONOR
