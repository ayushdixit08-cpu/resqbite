from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from common.permissions import IsAdminUserRole
from common.responses import success_response
from common.services import haversine_km
from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationViewSet(ReadOnlyModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Organization.objects.filter(verification_status=Organization.VERIFICATION_VERIFIED).order_by("name")

    def get_queryset(self):
        if self.action == "verify":
            return Organization.objects.all()
        return super().get_queryset()

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data)

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUserRole])
    def verify(self, request, pk=None):
        organization = self.get_object()
        decision = request.data.get("status", Organization.VERIFICATION_VERIFIED)
        if decision not in {
            Organization.VERIFICATION_VERIFIED,
            Organization.VERIFICATION_REJECTED,
        }:
            return Response({"detail": "status must be VERIFIED or REJECTED."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            organization = Organization.objects.select_for_update().get(pk=organization.pk)
            organization.verification_status = decision
            organization.save(update_fields=["verification_status", "updated_at"])
            organization.user.is_verified = decision == Organization.VERIFICATION_VERIFIED
            organization.user.save(update_fields=["is_verified"])
        return success_response(self.get_serializer(organization).data, "Organization verification updated.")


class OrganizationProfileView(generics.GenericAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _check_role(self, request):
        if request.user.role != "NGO":
            raise PermissionDenied("Only NGO users can manage an organization profile.")

    def get(self, request):
        self._check_role(request)
        organization = Organization.objects.filter(user=request.user).first()
        if organization is None:
            return Response({"detail": "Organization profile not found."}, status=status.HTTP_404_NOT_FOUND)
        return success_response(self.get_serializer(organization).data)

    def post(self, request):
        self._check_role(request)
        if Organization.objects.filter(user=request.user).exists():
            return Response({"detail": "An organization profile already exists."}, status=status.HTTP_409_CONFLICT)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save(user=request.user)
        return success_response(self.get_serializer(organization).data, "Organization profile created.", status.HTTP_201_CREATED)

    def patch(self, request):
        self._check_role(request)
        organization = Organization.objects.filter(user=request.user).first()
        if organization is None:
            return Response({"detail": "Organization profile not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(organization, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, "Organization profile updated.")


class NearbyOrganizationsView(generics.GenericAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            latitude = float(request.query_params["latitude"])
            longitude = float(request.query_params["longitude"])
            radius = float(request.query_params.get("radius", "25"))
            if radius <= 0 or radius > 500:
                raise ValueError
        except (KeyError, TypeError, ValueError) as exc:
            return Response({"detail": "Valid latitude, longitude, and radius (0-500 km) are required."}, status=status.HTTP_400_BAD_REQUEST)

        nearby = []
        for organization in Organization.objects.filter(
            verification_status=Organization.VERIFICATION_VERIFIED,
            latitude__isnull=False,
            longitude__isnull=False,
        ):
            distance = haversine_km(latitude, longitude, organization.latitude, organization.longitude)
            if distance <= radius:
                data = self.get_serializer(organization).data
                data["distance_km"] = round(distance, 2)
                nearby.append(data)
        nearby.sort(key=lambda item: item["distance_km"])
        return success_response(nearby)
