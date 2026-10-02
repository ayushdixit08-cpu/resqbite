from rest_framework import serializers
from django.utils import timezone

from common.services import validate_image
from .models import Donation, DonationImage, DonationRequest, FoodSafetyChecklist


class DonationImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = DonationImage
        fields = ("id", "url", "alt_text", "created_at")
        read_only_fields = fields

    def get_url(self, instance):
        request = self.context.get("request")
        url = instance.image.url
        return request.build_absolute_uri(url) if request else url


class FoodSafetyChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodSafetyChecklist
        exclude = ("donation", "id", "created_at")

    def validate(self, attrs):
        for field in ("freshly_prepared", "properly_packed", "expiry_marked", "food_type_marked"):
            if attrs.get(field) is not True:
                raise serializers.ValidationError({field: "This safety requirement must be confirmed."})
        return attrs


class DonationSerializer(serializers.ModelSerializer):
    food_safety = FoodSafetyChecklistSerializer()
    images = serializers.ListField(child=serializers.ImageField(), write_only=True, required=False)
    image_details = DonationImageSerializer(source="images", many=True, read_only=True)
    donor_name = serializers.CharField(source="donor.name", read_only=True)

    class Meta:
        model = Donation
        fields = (
            "id", "donor", "donor_name", "organization", "food_name", "category", "food_type",
            "quantity", "quantity_unit", "people_served", "prepared_at", "expires_at",
            "pickup_address", "latitude", "longitude", "special_instructions", "status",
            "food_safety", "images", "image_details", "created_at", "updated_at",
        )
        read_only_fields = ("id", "donor", "organization", "status", "created_at", "updated_at")

    def validate(self, attrs):
        prepared_at = attrs.get("prepared_at", getattr(self.instance, "prepared_at", None))
        expires_at = attrs.get("expires_at", getattr(self.instance, "expires_at", None))
        if prepared_at and prepared_at > timezone.now():
            raise serializers.ValidationError({"prepared_at": "Preparation time cannot be in the future."})
        if expires_at and expires_at <= timezone.now():
            raise serializers.ValidationError({"expires_at": "Expiry time must be in the future."})
        if prepared_at and expires_at and expires_at <= prepared_at:
            raise serializers.ValidationError({"expires_at": "Expiry time must be later than preparation time."})
        checklist_data = attrs.get("food_safety")
        if not self.instance and not checklist_data:
            raise serializers.ValidationError({"food_safety": "Food safety checklist is required."})
        for image in attrs.get("images", []):
            validate_image(image)
        return attrs

    def create(self, validated_data):
        checklist_data = validated_data.pop("food_safety")
        images = validated_data.pop("images", [])
        donation = Donation.objects.create(**validated_data)
        FoodSafetyChecklist.objects.create(donation=donation, **checklist_data)
        from .models import DonationImage

        DonationImage.objects.bulk_create([DonationImage(donation=donation, image=image) for image in images])
        return donation

    def update(self, instance, validated_data):
        checklist_data = validated_data.pop("food_safety", None)
        images = validated_data.pop("images", [])
        instance = super().update(instance, validated_data)
        if checklist_data is not None:
            FoodSafetyChecklist.objects.update_or_create(
                donation=instance,
                defaults=checklist_data,
            )
        if images:
            from .models import DonationImage

            DonationImage.objects.bulk_create([DonationImage(donation=instance, image=image) for image in images])
        return instance


class DonationRequestSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = DonationRequest
        fields = ("id", "donation", "organization", "organization_name", "status", "message", "created_at", "updated_at")
        read_only_fields = ("id", "organization", "organization_name", "status", "created_at", "updated_at")
