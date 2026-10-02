from rest_framework import serializers

from .models import TrackingEvent, VolunteerLocation


class TrackingEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.name", read_only=True, default=None)

    class Meta:
        model = TrackingEvent
        fields = ("id", "donation", "status", "notes", "actor", "actor_name", "created_at")
        read_only_fields = fields


class VolunteerLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VolunteerLocation
        fields = ("latitude", "longitude", "updated_at")
        read_only_fields = ("updated_at",)

    def validate_latitude(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value
