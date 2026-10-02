import uuid

from django.db import models

from accounts.models import User
from donations.models import Donation


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews_written")
    reviewed_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews_received")
    rating = models.PositiveSmallIntegerField()
    feedback = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["donation", "reviewer", "reviewed_user"], name="unique_donation_review"),
            models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name="review_rating_1_to_5"),
        ]
        indexes = [models.Index(fields=["reviewed_user", "created_at"])]
