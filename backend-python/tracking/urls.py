from django.urls import path

from .views import DonationTrackingView, TrackingEventDetailView, VolunteerLocationView

urlpatterns = [
    path("donation/<uuid:donation_id>/", DonationTrackingView.as_view(), name="donation-tracking"),
    path("location/", VolunteerLocationView.as_view(), name="volunteer-location"),
    path("<uuid:event_id>/", TrackingEventDetailView.as_view(), name="tracking-event"),
]
