from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.name", read_only=True)

    class Meta:
        model = Event
        fields = (
            "id", "organizer", "organizer_name", "name", "event_date", "expected_food_quantity",
            "pickup_time", "address", "latitude", "longitude", "instructions", "status",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "organizer", "organizer_name", "created_at", "updated_at")
