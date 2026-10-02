from rest_framework import serializers

from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = Organization
        fields = (
            "id", "user_id", "name", "description", "registration_document", "phone",
            "website", "address", "latitude", "longitude", "food_preferences",
            "capacity", "current_demand", "verification_status", "response_time_minutes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "verification_status", "response_time_minutes", "created_at", "updated_at")

    def validate_latitude(self, value):
        if value is not None and not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None and not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value
