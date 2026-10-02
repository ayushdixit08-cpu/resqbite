from django.urls import path

from .views import (
    AdminDashboardView,
    AdminDeactivateUserView,
    AdminDeliveryListView,
    AdminDonationListView,
    AdminReportsView,
    AdminUserListView,
    AnalyticsOverviewView,
    EnvironmentalImpactView,
)

urlpatterns = [
    path("overview/", AnalyticsOverviewView.as_view(), name="analytics-overview"),
    path("impact/", EnvironmentalImpactView.as_view(), name="environmental-impact"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/users/", AdminUserListView.as_view(), name="admin-users"),
    path("admin/users/<uuid:user_id>/deactivate/", AdminDeactivateUserView.as_view(), name="admin-user-deactivate"),
    path("admin/donations/", AdminDonationListView.as_view(), name="admin-donations"),
    path("admin/deliveries/", AdminDeliveryListView.as_view(), name="admin-deliveries"),
    path("admin/reports/", AdminReportsView.as_view(), name="admin-reports"),
]
