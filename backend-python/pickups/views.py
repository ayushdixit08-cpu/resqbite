from django.db import transaction
from django.utils import timezone
from rest_framework import permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.viewsets import ModelViewSet

from accounts.models import User
from common.responses import success_response
from notifications.models import Notification
from tracking.models import TrackingEvent
from volunteers.models import VolunteerProfile

from .models import PickupTask
from .serializers import PickupTaskSerializer


class PickupTaskViewSet(ModelViewSet):
    serializer_class = PickupTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        queryset = PickupTask.objects.select_related("donation", "organization", "volunteer")
        if user.role == User.ROLE_VOLUNTEER:
            if self.action == "list":
                return queryset.filter(volunteer__isnull=True, status=PickupTask.STATUS_ASSIGNED) | queryset.filter(volunteer=user)
            return queryset.filter(volunteer=user)
        if user.role == User.ROLE_DONOR:
            return queryset.filter(donation__donor=user)
        if user.role == User.ROLE_NGO:
            return queryset.filter(organization__user=user)
        if user.role == User.ROLE_ADMIN:
            return queryset
        return queryset.none()

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data)

    @action(detail=False, methods=["get"])
    def tasks(self, request):
        if request.user.role != User.ROLE_VOLUNTEER:
            raise PermissionDenied("Volunteer role is required.")
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        data = self.get_serializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data)

    @action(detail=False, methods=["get"])
    def history(self, request):
        if request.user.role != User.ROLE_VOLUNTEER:
            raise PermissionDenied("Volunteer role is required.")
        queryset = PickupTask.objects.filter(volunteer=request.user).exclude(status=PickupTask.STATUS_ASSIGNED).order_by("-updated_at")
        page = self.paginate_queryset(queryset)
        data = self.get_serializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        if request.user.role != User.ROLE_VOLUNTEER:
            raise PermissionDenied("Volunteer role is required.")
        with transaction.atomic():
            task = PickupTask.objects.select_for_update().get(pk=self.get_object().pk)
            profile, _ = VolunteerProfile.objects.select_for_update().get_or_create(user=request.user)
            if not profile.is_available:
                raise ValidationError("Set your volunteer profile to available before accepting a task.")
            if task.volunteer_id is not None or task.status != PickupTask.STATUS_ASSIGNED:
                raise ValidationError("This task has already been claimed.")
            task.volunteer = request.user
            task.status = PickupTask.STATUS_ACCEPTED
            task.accepted_at = timezone.now()
            task.save(update_fields=["volunteer", "status", "accepted_at", "updated_at"])
            TrackingEvent.objects.create(donation=task.donation, status="VOLUNTEER_ASSIGNED", actor=request.user)
            Notification.objects.create(
                recipient=task.donation.donor,
                notification_type="VOLUNTEER_ASSIGNMENT",
                title="Volunteer assigned",
                message=f"A volunteer accepted delivery for {task.donation.food_name}.",
                data={"donation_id": str(task.donation_id), "task_id": str(task.id)},
            )
        return success_response(self.get_serializer(task).data, "Pickup task accepted.")

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        task = self.get_object()
        if task.volunteer_id != request.user.id or request.user.role != User.ROLE_VOLUNTEER:
            raise PermissionDenied("Only the assigned volunteer can update task status.")
        requested_status = request.data.get("status")
        allowed_transitions = {
            PickupTask.STATUS_ACCEPTED: PickupTask.STATUS_PICKUP_STARTED,
            PickupTask.STATUS_PICKED_UP: PickupTask.STATUS_IN_TRANSIT,
        }
        if allowed_transitions.get(task.status) != requested_status:
            raise ValidationError("Invalid status transition. Pickup and delivery completion require QR verification.")
        task.status = requested_status
        task.save(update_fields=["status", "updated_at"])
        TrackingEvent.objects.create(donation=task.donation, status=requested_status, actor=request.user)
        if requested_status == PickupTask.STATUS_PICKUP_STARTED:
            Notification.objects.create(
                recipient=task.donation.donor,
                notification_type="PICKUP_STARTED",
                title="Pickup started",
                message=f"Pickup has started for {task.donation.food_name}.",
                data={"donation_id": str(task.donation_id)},
            )
        return success_response(self.get_serializer(task).data, "Task status updated.")
