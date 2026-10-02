from django.urls import path

from .views import EventDetailView, EventListView

urlpatterns = [
    path("", EventListView.as_view(), name="event-list"),
    path("<uuid:event_id>/", EventDetailView.as_view(), name="event-detail"),
]
