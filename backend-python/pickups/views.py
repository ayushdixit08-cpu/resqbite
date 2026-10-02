from rest_framework import permissions, viewsets

from .models import PickupTask
from .serializers import PickupTaskSerializer


class PickupTaskViewSet(viewsets.ModelViewSet):
    queryset = PickupTask.objects.all().order_by("-created_at")
    serializer_class = PickupTaskSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
