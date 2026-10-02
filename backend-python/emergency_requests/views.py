from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from common.views import ResQBiteAPIView as APIView

from accounts.models import User
from common.pagination import ResQBitePagination
from common.responses import success_response
from donations.models import Donation
from organizations.models import Organization

from .models import EmergencyFoodRequest
from .serializers import EmergencyFoodRequestSerializer


class EmergencyRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = EmergencyFoodRequest.objects.select_related("organization").order_by("required_before")
        if request.user.role == User.ROLE_NGO:
            queryset = queryset.filter(status=EmergencyFoodRequest.STATUS_OPEN) | queryset.filter(organization__user=request.user)
        elif request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Only NGOs and admins can view emergency requests.")
        paginator = ResQBitePagination()
        page = paginator.paginate_queryset(queryset.distinct(), request, view=self)
        if page is not None:
            return paginator.get_paginated_response(EmergencyFoodRequestSerializer(page, many=True).data)
        return success_response(EmergencyFoodRequestSerializer(queryset.distinct(), many=True).data)

    def post(self, request):
        if request.user.role != User.ROLE_NGO:
            raise PermissionDenied("Only NGO accounts can create emergency requests.")
        organization = Organization.objects.filter(user=request.user, verification_status=Organization.VERIFICATION_VERIFIED).first()
        if organization is None:
            raise PermissionDenied("A verified organization profile is required.")
        serializer = EmergencyFoodRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(organization=organization)
        return success_response(EmergencyFoodRequestSerializer(instance).data, "Emergency food request created.", status.HTTP_201_CREATED)


class EmergencyRequestDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, request_id):
        obj = EmergencyFoodRequest.objects.select_related("organization", "organization__user").filter(pk=request_id).first()
        if obj is None:
            return None
        if request.user.role != User.ROLE_ADMIN and obj.organization.user_id != request.user.id:
            raise PermissionDenied()
        return obj

    def get(self, request, request_id):
        obj = self._get(request, request_id)
        if obj is None:
            return Response({"detail": "Emergency request not found."}, status=status.HTTP_404_NOT_FOUND)
        return success_response(EmergencyFoodRequestSerializer(obj).data)

    def patch(self, request, request_id):
        obj = self._get(request, request_id)
        if obj is None:
            return Response({"detail": "Emergency request not found."}, status=status.HTTP_404_NOT_FOUND)
        requested_status = request.data.get("status")
        if requested_status and request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Only administrators may change request status.")
        serializer = EmergencyFoodRequestSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        if requested_status:
            allowed_statuses = {choice for choice, _ in EmergencyFoodRequest.STATUS_CHOICES}
            if requested_status not in allowed_statuses:
                raise ValidationError({"status": "Invalid emergency request status."})
            obj.status = requested_status
            obj.save(update_fields=["status", "updated_at"])
        matches = Donation.objects.filter(
            status=Donation.STATUS_PENDING,
            expires_at__gt=timezone.now(),
            category=obj.category,
            quantity__gte=obj.quantity_required,
        )
        return success_response({
            "request": EmergencyFoodRequestSerializer(obj).data,
            "matching_donation_ids": list(matches.values_list("id", flat=True)),
        }, "Emergency request updated.")
