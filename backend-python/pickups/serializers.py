from rest_framework import serializers

from .models import PickupTask


class PickupTaskSerializer(serializers.ModelSerializer):
    donation_name = serializers.CharField(source="donation.food_name", read_only=True)
    volunteer_name = serializers.CharField(source="volunteer.name", read_only=True, default=None)

    class Meta:
        model = PickupTask
        fields = (
            "id", "donation", "donation_name", "organization", "volunteer", "volunteer_name",
            "status", "notes", "pickup_address", "pickup_latitude", "pickup_longitude",
            "delivery_address", "delivery_latitude", "delivery_longitude", "estimated_arrival",
            "assigned_at", "accepted_at", "completed_at", "updated_at",
        )
        read_only_fields = fields
