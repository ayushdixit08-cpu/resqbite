from django.db import IntegrityError, transaction

from volunteers.models import VolunteerProfile

from .models import Reward


@transaction.atomic
def award_points(user, points, reason, donation_id):
    reward, created = Reward.objects.get_or_create(
        user=user,
        donation_id=donation_id,
        reason=reason,
        defaults={"points": points},
    )
    if not created:
        return reward, False
    if user.role == "VOLUNTEER":
        profile, _ = VolunteerProfile.objects.select_for_update().get_or_create(user=user)
        profile.points += points
        profile.completed_deliveries += 1 if reason == "DONATION_DELIVERED" else 0
        profile.save(update_fields=["points", "completed_deliveries", "updated_at"])
    return reward, True
