from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source="reviewer.name", read_only=True)
    reviewed_user_name = serializers.CharField(source="reviewed_user.name", read_only=True)

    class Meta:
        model = Review
        fields = ("id", "donation", "reviewer", "reviewer_name", "reviewed_user", "reviewed_user_name", "rating", "feedback", "created_at")
        read_only_fields = ("id", "reviewer", "reviewer_name", "reviewed_user_name", "created_at")

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
