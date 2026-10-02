from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NearbyOrganizationsView, OrganizationProfileView, OrganizationViewSet

router = DefaultRouter()
router.register(r"", OrganizationViewSet, basename="organization")

urlpatterns = [
    path("profile/", OrganizationProfileView.as_view(), name="organization-profile"),
    path("nearby/", NearbyOrganizationsView.as_view(), name="organization-nearby"),
    path("", include(router.urls)),
]
