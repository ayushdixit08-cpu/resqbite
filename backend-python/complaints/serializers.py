from rest_framework import serializers

from .models import Complaint


class ComplaintSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source="reporter.name", read_only=True)

    class Meta:
        model = Complaint
        fields = (
            "id", "reporter", "reporter_name", "donation", "reported_user", "category",
            "description", "status", "resolution_notes", "created_at", "updated_at",
        )
        read_only_fields = ("id", "reporter", "reporter_name", "status", "resolution_notes", "created_at", "updated_at")
