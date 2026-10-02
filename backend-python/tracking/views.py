from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from common.responses import success_response
from donations.models import Donation
from pickups.models import PickupTask

from .models import TrackingEvent, VolunteerLocation
from .serializers import TrackingEventSerializer, VolunteerLocationSerializer


class DonationTrackingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, donation_id):
        donation = Donation.objects.filter(pk=donation_id).first()
        if donation is None:
            return Response({"detail": "Donation not found."}, status=status.HTTP_404_NOT_FOUND)
        allowed = (
            request.user.role == User.ROLE_ADMIN
            or donation.donor_id == request.user.id
            or (donation.organization_id and donation.organization.user_id == request.user.id)
            or PickupTask.objects.filter(donation=donation, volunteer=request.user).exists()
        )
        if not allowed:
            raise PermissionDenied()
        events = TrackingEvent.objects.filter(donation=donation).select_related("actor")
        return success_response({
            "donation_id": str(donation.id),
            "status": donation.status,
            "events": TrackingEventSerializer(events, many=True, context={"request": request}).data,
        })


class TrackingEventDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        event = TrackingEvent.objects.select_related("donation", "donation__organization").filter(pk=event_id).first()
        if event is None:
            return Response({"detail": "Tracking event not found."}, status=status.HTTP_404_NOT_FOUND)
        donation = event.donation
        allowed = (
            request.user.role == User.ROLE_ADMIN
            or donation.donor_id == request.user.id
            or (donation.organization_id and donation.organization.user_id == request.user.id)
            or PickupTask.objects.filter(donation=donation, volunteer=request.user).exists()
        )
        if not allowed:
            raise PermissionDenied()
        return success_response(TrackingEventSerializer(event).data)


class VolunteerLocationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != User.ROLE_VOLUNTEER:
            raise PermissionDenied("Volunteer role is required.")
        serializer = VolunteerLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        location, _ = VolunteerLocation.objects.update_or_create(
            volunteer=request.user,
            defaults=serializer.validated_data,
        )
        User.objects.filter(pk=request.user.pk).update(
            latitude=location.latitude,
            longitude=location.longitude,
        )
        return success_response(VolunteerLocationSerializer(location).data, "Volunteer location updated.")
