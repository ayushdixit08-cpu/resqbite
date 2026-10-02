from django.urls import path

from .views import ComplaintDetailView, ComplaintListView, FraudAlertListView

urlpatterns = [
    path("", ComplaintListView.as_view(), name="complaint-list"),
    path("fraud-alerts/", FraudAlertListView.as_view(), name="fraud-alerts"),
    path("<uuid:complaint_id>/", ComplaintDetailView.as_view(), name="complaint-detail"),
]
