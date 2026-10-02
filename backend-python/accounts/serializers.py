from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
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
    role = serializers.CharField(default=User.ROLE_DONOR)

    class Meta:
        model = User
        fields = ("email", "name", "phone", "role", "password")

    def validate_role(self, value):
        allowed = {User.ROLE_DONOR, User.ROLE_NGO, User.ROLE_VOLUNTEER}
        normalized = str(value).upper()
        if normalized in {"ORG", "ORGANIZATION"}:
            normalized = User.ROLE_NGO
        if normalized not in allowed:
            raise serializers.ValidationError("Role must be DONOR, NGO, or VOLUNTEER.")
        return normalized

    def validate_email(self, value):
        normalized = value.strip().casefold()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(email=attrs["email"].strip().casefold(), password=attrs["password"])
        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid email or password.")
        return {"user": user}


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "name", "phone", "role", "profile_image", "address", "latitude", "longitude", "is_verified", "created_at", "updated_at")
        read_only_fields = ("id", "email", "role", "is_verified", "created_at", "updated_at")

    def validate_latitude(self, value):
        if value is not None and not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None and not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value