from rest_framework import permissions, viewsets

from .models import TrackingEvent
from .serializers import TrackingEventSerializer


class TrackingEventViewSet(viewsets.ModelViewSet):
    queryset = TrackingEvent.objects.all().order_by("-created_at")
    serializer_class = TrackingEventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
