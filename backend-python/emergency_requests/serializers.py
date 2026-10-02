from rest_framework import serializers

from .models import EmergencyFoodRequest


class EmergencyFoodRequestSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = EmergencyFoodRequest
        fields = (
            "id", "organization", "organization_name", "category", "quantity_required",
            "people_served", "urgency", "address", "latitude", "longitude",
            "required_before", "status", "created_at", "updated_at",
        )
        read_only_fields = ("id", "organization", "organization_name", "status", "created_at", "updated_at")

    def validate_urgency(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Urgency must be between 1 and 5.")
        return value
