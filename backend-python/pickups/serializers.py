from rest_framework import serializers

from .models import PickupTask


class PickupTaskSerializer(serializers.ModelSerializer):
    donation_name = serializers.CharField(source="donation.food_name", read_only=True)
    donor_name = serializers.CharField(source="donation.donor.name", read_only=True)
    quantity = serializers.DecimalField(source="donation.quantity", max_digits=10, decimal_places=2, read_only=True)
    quantity_unit = serializers.CharField(source="donation.quantity_unit", read_only=True)
    people_served = serializers.IntegerField(source="donation.people_served", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    volunteer_name = serializers.CharField(source="volunteer.name", read_only=True, default=None)

    class Meta:
        model = PickupTask
        fields = (
            "id", "donation", "donation_name", "donor_name", "quantity", "quantity_unit",
            "people_served", "organization", "organization_name", "volunteer", "volunteer_name",
            "status", "notes", "pickup_address", "pickup_latitude", "pickup_longitude",
            "delivery_address", "delivery_latitude", "delivery_longitude", "estimated_arrival",
            "assigned_at", "accepted_at", "completed_at", "updated_at",
        )
        read_only_fields = fields
