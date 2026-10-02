from django.urls import path

from .views import EmergencyRequestDetailView, EmergencyRequestListView

urlpatterns = [
    path("", EmergencyRequestListView.as_view(), name="emergency-request-list"),
    path("<uuid:request_id>/", EmergencyRequestDetailView.as_view(), name="emergency-request-detail"),
]
