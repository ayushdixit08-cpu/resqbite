from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from accounts.models import User
from common.responses import success_response
from common.services import haversine_km
from .models import VolunteerProfile
from .serializers import VolunteerProfileSerializer


class VolunteerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = VolunteerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if self.request.user.role != "VOLUNTEER":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Volunteer role is required.")
        profile, _ = VolunteerProfile.objects.get_or_create(user=self.request.user)
        return profile

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, "Volunteer profile updated.")


class NearbyVolunteersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            latitude = float(request.query_params["latitude"])
            longitude = float(request.query_params["longitude"])
            radius = float(request.query_params.get("radius", "25"))
            if radius <= 0 or radius > 500:
                raise ValueError
        except (KeyError, TypeError, ValueError) as exc:
            raise ValidationError("Valid latitude, longitude, and radius (0-500 km) are required.") from exc

        profiles = VolunteerProfile.objects.filter(
            is_available=True,
            user__is_active=True,
            user__latitude__isnull=False,
            user__longitude__isnull=False,
        ).select_related("user")
        results = []
        for profile in profiles:
            distance = haversine_km(latitude, longitude, profile.user.latitude, profile.user.longitude)
            if distance <= min(radius, profile.service_radius_km):
                results.append({
                    **VolunteerProfileSerializer(profile).data,
                    "distance_km": round(distance, 2),
                })
        results.sort(key=lambda item: item["distance_km"])
        from common.pagination import ResQBitePagination

        paginator = ResQBitePagination()
        page = paginator.paginate_queryset(results, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return success_response(results)
