from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DonationRequestViewSet, DonationViewSet, QRGenerateView, QRVerifyView

router = DefaultRouter()
router.register(r"", DonationViewSet, basename="donation")

urlpatterns = [
    path("search/", DonationViewSet.as_view({"get": "search"}), name="donation-search"),
    path("nearby/", DonationViewSet.as_view({"get": "nearby"}), name="donation-nearby"),
    path("my/", DonationViewSet.as_view({"get": "my"}), name="donation-my"),
    path("history/", DonationViewSet.as_view({"get": "history"}), name="donation-history"),
    path("requests/", DonationRequestViewSet.as_view({"get": "list", "post": "create"}), name="donation-requests"),
    path("requests/<uuid:pk>/", DonationRequestViewSet.as_view({"get": "retrieve"}), name="donation-request-detail"),
    path("requests/<uuid:pk>/accept/", DonationRequestViewSet.as_view({"post": "accept"}), name="donation-request-accept"),
    path("requests/<uuid:pk>/reject/", DonationRequestViewSet.as_view({"post": "reject"}), name="donation-request-reject"),
    path("qr/<uuid:donation_id>/generate/", QRGenerateView.as_view({"post": "create"}), name="qr-generate"),
    path("qr/verify/", QRVerifyView.as_view({"post": "create"}), name="qr-verify"),
    path("", include(router.urls)),
]
