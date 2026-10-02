from rest_framework import permissions, viewsets

from .models import Donation
from .serializers import DonationSerializer


class DonationViewSet(viewsets.ModelViewSet):
    queryset = Donation.objects.all().order_by("-created_at")
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_authenticated and self.request.user.is_donor:
            return queryset.filter(donor=self.request.user)
        return queryset
