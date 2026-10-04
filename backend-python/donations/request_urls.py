from django.urls import path

from .views import DonationRequestViewSet

urlpatterns = [
    path(
        "",
        DonationRequestViewSet.as_view({"get": "list", "post": "create"}),
        name="donation-request-list",
    ),
    path(
        "<uuid:pk>/",
        DonationRequestViewSet.as_view({"get": "retrieve"}),
        name="donation-request-detail",
    ),
    path(
        "<uuid:pk>/accept/",
        DonationRequestViewSet.as_view({"post": "accept"}),
        name="donation-request-accept",
    ),
    path(
        "<uuid:pk>/reject/",
        DonationRequestViewSet.as_view({"post": "reject"}),
        name="donation-request-reject",
    ),
]
