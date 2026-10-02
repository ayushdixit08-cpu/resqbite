from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import VolunteerProfile


class VolunteerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = VolunteerProfile
        fields = ("id", "user", "is_available", "service_radius_km", "points", "completed_deliveries", "created_at", "updated_at")
        read_only_fields = ("id", "user", "points", "completed_deliveries", "created_at", "updated_at")

    def validate_service_radius_km(self, value):
        if not 1 <= value <= 200:
            raise serializers.ValidationError("Service radius must be between 1 and 200 km.")
        return value
