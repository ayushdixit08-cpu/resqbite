from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from common.views import ResQBiteAPIView as APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView

from .models import User
from .serializers import LoginSerializer, ProfileSerializer, RegisterSerializer, UserSerializer
from common.responses import success_response
from complaints.fraud_service import inspect_registration

token_generator = PasswordResetTokenGenerator()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = serializer.save()
        except IntegrityError as exc:
            if User.objects.filter(email__iexact=serializer.validated_data["email"]).exists():
                raise ValidationError(
                    {"email": "An account with this email already exists."},
                    code="duplicate_email",
                ) from exc
            raise
        inspect_registration(user)
        refresh = RefreshToken.for_user(user)
        return success_response(
            {
                "token": str(refresh.access_token),
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            "Account created successfully.",
            status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return success_response(
            {
                "token": str(refresh.access_token),
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            "Login successful.",
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return success_response(UserSerializer(request.user).data)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, "Profile updated.")


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            raise ValidationError({"refresh": "A refresh token is required."})
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError as exc:
            raise ValidationError({"refresh": "The refresh token is invalid or expired."}) from exc
        return success_response({}, "Logged out successfully.")


class TokenRefreshView(SimpleJWTTokenRefreshView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return success_response(response.data, "Token refreshed.")


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        email = str(request.data.get("email", "")).strip().casefold()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                "Reset your ResQBite password",
                f"Use this link to reset your password: {reset_url}",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        return success_response({}, "If the account exists, password reset instructions have been sent.")


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")
        if not uid or not token or not password:
            raise ValidationError("uid, token, and password are required.")
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (User.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError("The password reset link is invalid or expired.") from exc
        if not token_generator.check_token(user, token):
            raise ValidationError("The password reset link is invalid or expired.")
        from django.contrib.auth.password_validation import validate_password

        validate_password(password, user)
        user.set_password(password)
        user.save(update_fields=["password"])
        return success_response({}, "Password has been reset.")


class EmailVerificationRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_verified:
            return success_response({}, "Email is already verified.")
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)
        verify_url = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
        send_mail(
            "Verify your ResQBite email",
            f"Use this link to verify your email: {verify_url}",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return success_response({}, "Verification instructions have been sent.")


class EmailVerificationConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid, token = request.data.get("uid"), request.data.get("token")
        if not uid or not token:
            raise ValidationError("uid and token are required.")
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (User.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError("The verification link is invalid or expired.") from exc
        if not token_generator.check_token(user, token):
            raise ValidationError("The verification link is invalid or expired.")
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        return success_response({}, "Email verified.")


class GoogleSignInView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        return Response(
            {
                "success": False,
                "message": "Google sign-in is not configured for this deployment.",
                "errors": {"provider": "Configure and validate a Google OAuth client before enabling sign-in."},
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
