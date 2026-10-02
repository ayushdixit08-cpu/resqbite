from django.urls import path
from .views import (
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    GoogleSignInView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    TokenRefreshView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("email-verification/", EmailVerificationRequestView.as_view(), name="email_verification"),
    path("email-verification/confirm/", EmailVerificationConfirmView.as_view(), name="email_verification_confirm"),
    path("google", GoogleSignInView.as_view(), name="google-sign-in"),
]
