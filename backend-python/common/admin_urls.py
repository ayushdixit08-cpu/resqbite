from django.urls import include, path

from analytics.views import (
    AdminDashboardView,
    AdminDeactivateUserView,
    AdminDeliveryListView,
    AdminDonationListView,
    AdminReportsView,
    AdminUserListView,
)
from organizations.views import OrganizationViewSet
from organizations.views import AdminOrganizationListView

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("users/", AdminUserListView.as_view(), name="admin-users"),
    path("users/<uuid:user_id>/deactivate/", AdminDeactivateUserView.as_view(), name="admin-user-deactivate"),
    path("ngos/", AdminOrganizationListView.as_view(), name="admin-ngos"),
    path("ngos/<uuid:pk>/verify/", OrganizationViewSet.as_view({"post": "verify"}), name="admin-ngo-verify"),
    path("donations/", AdminDonationListView.as_view(), name="admin-donations"),
    path("deliveries/", AdminDeliveryListView.as_view(), name="admin-deliveries"),
    path("reports/", AdminReportsView.as_view(), name="admin-reports"),
    path("complaints/", include("complaints.urls")),
]
