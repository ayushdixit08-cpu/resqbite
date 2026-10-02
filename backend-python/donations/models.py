import uuid

from django.db import models
from django.db.models import Q

from accounts.models import User
from organizations.models import Organization


class Donation(models.Model):
    CATEGORY_CHOICES = [
        ("VEG", "Veg"),
        ("NON_VEG", "Non-Veg"),
        ("VEGAN", "Vegan"),
        ("DESSERTS", "Desserts"),
        ("BAKERY", "Bakery"),
        ("BEVERAGES", "Beverages"),
        ("FRUITS", "Fruits"),
        ("PACKED_FOOD", "Packed Food"),
    ]
    QUANTITY_UNIT_CHOICES = [
        ("kg", "Kilograms"),
        ("g", "Grams"),
        ("lb", "Pounds"),
        ("servings", "Servings"),
    ]
    STATUS_PENDING = "PENDING"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="donations")
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name="donations")
    food_name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    food_type = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_unit = models.CharField(max_length=30, choices=QUANTITY_UNIT_CHOICES, default="servings")
    people_served = models.PositiveIntegerField(default=1)
    prepared_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    pickup_address = models.CharField(max_length=255, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    special_instructions = models.TextField(blank=True, default="")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "expires_at"]),
            models.Index(fields=["category", "created_at"]),
            models.Index(fields=["latitude", "longitude"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="donation_quantity_positive"),
            models.CheckConstraint(condition=Q(people_served__gt=0), name="donation_people_positive"),
        ]

    def __str__(self):
        return f"{self.food_name} - {self.status}"


class FoodSafetyChecklist(models.Model):
    donation = models.OneToOneField(Donation, on_delete=models.CASCADE, related_name="food_safety")
    freshly_prepared = models.BooleanField()
    properly_packed = models.BooleanField()
    expiry_marked = models.BooleanField()
    food_type_marked = models.BooleanField()
    allergens = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)


class DonationImage(models.Model):
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="donations/")
    alt_text = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)


class DonationRequest(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_REJECTED = "REJECTED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="requests")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="donation_requests")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["donation", "organization"], name="unique_donation_ngo_request"),
            models.UniqueConstraint(
                fields=["donation"],
                condition=Q(status="ACCEPTED"),
                name="one_accepted_request_per_donation",
            ),
        ]
        indexes = [models.Index(fields=["status", "created_at"])]


class QRVerification(models.Model):
    donation = models.OneToOneField(Donation, on_delete=models.CASCADE, related_name="qr_verification")
    token_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    pickup_verified_at = models.DateTimeField(null=True, blank=True)
    delivery_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
