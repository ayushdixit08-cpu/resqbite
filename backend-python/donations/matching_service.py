from common.services import haversine_km
from organizations.models import Organization


def recommend_organizations(donation, radius_km=100):
    organizations = Organization.objects.filter(
        verification_status=Organization.VERIFICATION_VERIFIED,
        latitude__isnull=False,
        longitude__isnull=False,
    )
    matches = []
    for organization in organizations:
        distance = haversine_km(
            donation.latitude,
            donation.longitude,
            organization.latitude,
            organization.longitude,
        )
        if distance > radius_km:
            continue
        preferences = {str(value).upper() for value in organization.food_preferences}
        food_match = not preferences or donation.category in preferences
        capacity = max(organization.capacity - organization.current_demand, 0)
        matches.append({
            "organization": organization,
            "distance_km": round(distance, 2),
            "food_match": food_match,
            "available_capacity": capacity,
            "score": round(
                (1 / (1 + distance))
                + (1 if food_match else 0)
                + min(capacity, 1000) / 1000
                + (1 / (1 + (organization.response_time_minutes or 60) / 60)),
                4,
            ),
        })
    return sorted(matches, key=lambda item: (-item["score"], item["distance_km"]))
