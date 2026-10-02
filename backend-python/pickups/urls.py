from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PickupTaskViewSet

router = DefaultRouter()
router.register(r"", PickupTaskViewSet, basename="pickup")

urlpatterns = [
    path("", include(router.urls)),
]
