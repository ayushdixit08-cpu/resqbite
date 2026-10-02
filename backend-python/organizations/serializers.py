from rest_framework import serializers
from django.conf import settings

from common.services import validate_image
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    registration_document = serializers.FileField(write_only=True, required=False, allow_null=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    type = serializers.SerializerMethodField()
    verified = serializers.BooleanField(source="is_verified", read_only=True)
    bio = serializers.CharField(source="description", read_only=True)
    location = serializers.CharField(source="address", read_only=True)

    class Meta:
        model = Organization
        fields = (
            "id", "user_id", "name", "description", "registration_document", "phone",
            "website", "address", "latitude", "longitude", "food_preferences",
            "capacity", "current_demand", "verification_status", "response_time_minutes",
            "created_at", "updated_at", "type", "verified", "bio", "location",
        )
        read_only_fields = ("id", "verification_status", "response_time_minutes", "created_at", "updated_at")

    def get_type(self, instance) -> str:
        return "NGO"

    def validate_latitude(self, value):
        if value is not None and not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None and not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate_registration_document(self, document):
        if document is None:
            return document
        allowed_types = {"application/pdf", "image/jpeg", "image/png"}
        if document.content_type not in allowed_types:
            raise serializers.ValidationError("Registration documents must be PDF, JPEG, or PNG.")
        if document.size > settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
            limit_mb = settings.FILE_UPLOAD_MAX_MEMORY_SIZE // (1024 * 1024)
            raise serializers.ValidationError(f"Registration documents must not exceed {limit_mb} MB.")
        if document.content_type == "application/pdf":
            if not document.name.lower().endswith(".pdf"):
                raise serializers.ValidationError("PDF registration documents must use a .pdf filename.")
            document.seek(0)
            signature = document.read(5)
            document.seek(0)
            if signature != b"%PDF-":
                raise serializers.ValidationError("The uploaded file is not a valid PDF document.")
        else:
            validate_image(document)
        return document
