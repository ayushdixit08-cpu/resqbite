from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "name",
            "phone",
            "role",
            "profile_image",
            "is_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "is_verified")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "name", "phone", "role", "password")

    def validate_role(self, value):
        allowed = {User.ROLE_DONOR, User.ROLE_NGO, User.ROLE_VOLUNTEER, User.ROLE_ADMIN}
        if value is None:
            raise serializers.ValidationError("Role is required.")
        normalized = str(value).upper()
        if normalized not in allowed:
            raise serializers.ValidationError("Role must be DONOR, NGO, VOLUNTEER, or ADMIN.")
        return normalized

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(email=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        return {"user": user}
