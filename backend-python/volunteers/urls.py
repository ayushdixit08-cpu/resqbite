from django.urls import path

from pickups.views import PickupTaskViewSet

from .views import NearbyVolunteersView, VolunteerProfileView

urlpatterns = [
    path("profile/", VolunteerProfileView.as_view(), name="volunteer-profile"),
    path("nearby/", NearbyVolunteersView.as_view(), name="volunteer-nearby"),
    path("tasks/", PickupTaskViewSet.as_view({"get": "list"}), name="volunteer-tasks"),
    path("tasks/history/", PickupTaskViewSet.as_view({"get": "history"}), name="volunteer-task-history"),
    path("tasks/<uuid:pk>/accept/", PickupTaskViewSet.as_view({"post": "accept"}), name="volunteer-task-accept"),
    path("tasks/<uuid:pk>/status/", PickupTaskViewSet.as_view({"patch": "status"}), name="volunteer-task-status"),
]
