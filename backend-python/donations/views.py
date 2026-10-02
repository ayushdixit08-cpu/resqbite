import secrets
import hashlib
import hmac
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.models import User
from common.responses import success_response
from common.services import haversine_km
from notifications.models import Notification
from organizations.models import Organization
from pickups.models import PickupTask
from tracking.models import TrackingEvent
from complaints.fraud_service import inspect_donation
from rewards.services import award_points

from .matching_service import recommend_organizations
from .models import Donation, DonationRequest, QRVerification
from .serializers import DonationSerializer
from common.serializers import APIResponseSerializer


class DonationViewSet(ModelViewSet):
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        now = timezone.now()
        user = self.request.user
        donations = Donation.objects.select_related("donor", "organization").prefetch_related("images", "tracking_events")
        if user.role == User.ROLE_DONOR:
            donations = donations.filter(donor=user)
        elif user.role == User.ROLE_NGO:
            org = Organization.objects.filter(user=user).first()
            if self.action in {"my", "history", "status"}:
                donations = donations.filter(organization=org)
            else:
                donations = donations.filter(
                    Q(status=Donation.STATUS_PENDING, expires_at__gt=now)
                    | Q(organization=org)
                )
        elif user.role != User.ROLE_ADMIN:
            return donations.none()
        return donations

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return response

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data)

    def create(self, request, *args, **kwargs):
        if request.user.role != User.ROLE_DONOR:
            raise PermissionDenied("Only donors can create donations.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donation = serializer.save(donor=request.user)
        TrackingEvent.objects.create(donation=donation, status="DONATION_CREATED", actor=request.user)
        inspect_donation(donation)
        Notification.objects.create(
            recipient=request.user,
            notification_type="DONATION_CREATED",
            title="Donation created",
            message=f"{donation.food_name} is now available.",
            data={"donation_id": str(donation.id)},
        )
        return success_response(self.get_serializer(donation).data, "Donation created successfully.", status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        donation = self.get_object()
        if donation.donor_id != request.user.id or donation.status != Donation.STATUS_PENDING:
            raise PermissionDenied("Only the donor can edit an available, unclaimed donation.")
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(donation, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        donation = serializer.save()
        return success_response(self.get_serializer(donation).data, "Donation updated.")

    def destroy(self, request, *args, **kwargs):
        donation = self.get_object()
        if donation.donor_id != request.user.id or donation.status != Donation.STATUS_PENDING:
            raise PermissionDenied("Only the donor can delete an available, unclaimed donation.")
        donation.delete()
        return success_response({}, "Donation deleted.")

    @action(detail=False, methods=["get"])
    def my(self, request):
        if request.user.role != User.ROLE_DONOR:
            raise PermissionDenied("Only donors can view their donations.")
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return success_response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"])
    def history(self, request):
        if request.user.role == User.ROLE_DONOR:
            queryset = self.get_queryset().exclude(status=Donation.STATUS_PENDING)
        elif request.user.role == User.ROLE_NGO:
            queryset = self.get_queryset().filter(status__in=[Donation.STATUS_COMPLETED, Donation.STATUS_CANCELLED])
        else:
            raise PermissionDenied("Donor or NGO role is required.")
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return success_response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        queryset = Donation.objects.filter(status=Donation.STATUS_PENDING, expires_at__gt=timezone.now())
        if request.query_params.get("category"):
            queryset = queryset.filter(category__iexact=request.query_params["category"])
        if request.query_params.get("food_type"):
            queryset = queryset.filter(food_type__icontains=request.query_params["food_type"])
        if request.query_params.get("expiry_before"):
            queryset = queryset.filter(expires_at__lte=request.query_params["expiry_before"])
        if request.query_params.get("min_quantity"):
            queryset = queryset.filter(quantity__gte=request.query_params["min_quantity"])
        if request.query_params.get("max_quantity"):
            queryset = queryset.filter(quantity__lte=request.query_params["max_quantity"])
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return success_response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        try:
            latitude = float(request.query_params["latitude"])
            longitude = float(request.query_params["longitude"])
            radius = float(request.query_params.get("radius", 25))
            if radius <= 0 or radius > 500:
                raise ValueError
        except (KeyError, TypeError, ValueError) as exc:
            raise ValidationError("Valid latitude, longitude, and radius (0-500 km) are required.") from exc
        queryset = Donation.objects.filter(
            status=Donation.STATUS_PENDING,
            expires_at__gt=timezone.now(),
            latitude__isnull=False,
            longitude__isnull=False,
        )
        matches = []
        for donation in queryset:
            distance = haversine_km(latitude, longitude, donation.latitude, donation.longitude)
            if distance <= radius:
                item = self.get_serializer(donation).data
                item["distance_km"] = round(distance, 2)
                matches.append(item)
        matches.sort(key=lambda item: item["distance_km"])
        page = self.paginate_queryset(matches)
        if page is not None:
            return self.get_paginated_response(page)
        return success_response(matches)

    @action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        donation = self.get_object()
        return success_response({
            "donation_id": str(donation.id),
            "status": donation.status,
            "history": list(donation.tracking_events.values("status", "notes", "created_at")),
        })

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            donation = Donation.objects.select_for_update().get(pk=self.get_object().pk)
            if donation.donor_id != request.user.id:
                raise PermissionDenied("Only the donor can cancel this donation.")
            if donation.status != Donation.STATUS_PENDING:
                raise ValidationError("Only donations that have not been accepted can be cancelled.")
            donation.status = Donation.STATUS_CANCELLED
            donation.save(update_fields=["status", "updated_at"])
            TrackingEvent.objects.create(donation=donation, status="CANCELLED", actor=request.user)
        return success_response(self.get_serializer(donation).data, "Donation cancelled.")

    @action(detail=True, methods=["get"], url_path="recommendations")
    def recommendations(self, request, pk=None):
        donation = self.get_object()
        if request.user.role not in {User.ROLE_DONOR, User.ROLE_ADMIN} and donation.donor_id != request.user.id:
            raise PermissionDenied()
        recommendations = recommend_organizations(donation)
        data = [
            {
                **self._organization_serializer(item["organization"]),
                "distance_km": item["distance_km"],
                "score": item["score"],
            }
            for item in recommendations
        ]
        return success_response(data)

    @staticmethod
    def _organization_serializer(organization):
        from organizations.serializers import OrganizationSerializer

        return OrganizationSerializer(organization).data


class DonationRequestViewSet(ModelViewSet):
    from .serializers import DonationRequestSerializer

    serializer_class = DonationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return DonationRequest.objects.select_related("donation", "organization", "organization__user")
        if user.role == User.ROLE_NGO:
            return DonationRequest.objects.filter(organization__user=user).select_related("donation", "organization")
        if user.role == User.ROLE_DONOR:
            return DonationRequest.objects.filter(donation__donor=user).select_related("donation", "organization")
        return DonationRequest.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role != User.ROLE_NGO:
            raise PermissionDenied("Only NGO accounts can request donations.")
        organization = Organization.objects.filter(user=request.user).first()
        if organization is None or organization.verification_status != Organization.VERIFICATION_VERIFIED:
            raise PermissionDenied("A verified organization profile is required.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donation = serializer.validated_data["donation"]
        if donation.status != Donation.STATUS_PENDING or donation.expires_at <= timezone.now():
            raise ValidationError({"donation": "This donation is no longer available."})
        try:
            with transaction.atomic():
                request_obj = serializer.save(organization=organization)
        except IntegrityError as exc:
            raise ValidationError({"donation": "Your organization already requested this donation."}) from exc
        return success_response(self.get_serializer(request_obj).data, "Donation request submitted.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        if request.user.role != User.ROLE_NGO:
            raise PermissionDenied("Only NGOs can accept donations.")
        request_obj = self.get_object()
        organization = Organization.objects.get(user=request.user)
        with transaction.atomic():
            donation = Donation.objects.select_for_update().get(pk=request_obj.donation_id)
            request_obj = DonationRequest.objects.select_for_update().get(pk=request_obj.pk)
            if request_obj.organization_id != organization.id:
                raise PermissionDenied()
            if request_obj.status != DonationRequest.STATUS_PENDING:
                raise ValidationError("This request has already been processed.")
            if donation.status != Donation.STATUS_PENDING or donation.expires_at <= timezone.now():
                raise ValidationError("This donation is no longer available.")
            if DonationRequest.objects.filter(donation=donation, status=DonationRequest.STATUS_ACCEPTED).exists():
                raise ValidationError("Another NGO has already accepted this donation.")
            request_obj.status = DonationRequest.STATUS_ACCEPTED
            request_obj.save(update_fields=["status", "updated_at"])
            donation.status = Donation.STATUS_ACCEPTED
            donation.organization = organization
            donation.save(update_fields=["status", "organization", "updated_at"])
            PickupTask.objects.create(
                donation=donation,
                organization=organization,
                pickup_address=donation.pickup_address,
                pickup_latitude=donation.latitude,
                pickup_longitude=donation.longitude,
                delivery_address=organization.address,
                delivery_latitude=organization.latitude,
                delivery_longitude=organization.longitude,
            )
            TrackingEvent.objects.create(donation=donation, status="NGO_ACCEPTED", actor=request.user)
            Notification.objects.create(
                recipient=donation.donor,
                notification_type="DONATION_ACCEPTED",
                title="Donation accepted",
                message=f"{organization.name} accepted {donation.food_name}.",
                data={"donation_id": str(donation.id)},
            )
        return success_response(self.get_serializer(request_obj).data, "Donation accepted.")

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        request_obj = self.get_object()
        if request.user.role != User.ROLE_NGO or request_obj.organization.user_id != request.user.id:
            raise PermissionDenied("Only the requesting NGO can reject this request.")
        if request_obj.status != DonationRequest.STATUS_PENDING:
            raise ValidationError("Only pending requests can be rejected.")
        request_obj.status = DonationRequest.STATUS_REJECTED
        request_obj.save(update_fields=["status", "updated_at"])
        return success_response(self.get_serializer(request_obj).data, "Donation request rejected.")


class QRGenerateView(ModelViewSet):
    serializer_class = APIResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["post", "head", "options"]

    def create(self, request, donation_id=None, *args, **kwargs):
        donation = Donation.objects.select_related("organization").filter(pk=donation_id).first()
        if donation is None:
            return Response({"detail": "Donation not found."}, status=status.HTTP_404_NOT_FOUND)
        is_owner = donation.donor_id == request.user.id
        is_accepted_ngo = donation.organization_id and donation.organization.user_id == request.user.id
        if not (is_owner or is_accepted_ngo or request.user.role == User.ROLE_ADMIN):
            raise PermissionDenied()
        if donation.status != Donation.STATUS_ACCEPTED:
            raise ValidationError("QR verification can be generated only after an NGO accepts the donation.")
        if donation.expires_at <= timezone.now():
            raise ValidationError("Expired donations cannot be QR-verified.")
        raw_token = secrets.token_urlsafe(32)
        with transaction.atomic():
            verification, _ = QRVerification.objects.select_for_update().get_or_create(
                donation=donation,
                defaults={
                    "token_hash": hashlib.sha256(raw_token.encode()).hexdigest(),
                    "expires_at": min(donation.expires_at, timezone.now() + timedelta(hours=48)),
                },
            )
            if verification.pk and verification.token_hash != hashlib.sha256(raw_token.encode()).hexdigest():
                verification.token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
                verification.expires_at = min(donation.expires_at, timezone.now() + timedelta(hours=48))
                verification.pickup_verified_at = None
                verification.delivery_verified_at = None
                verification.save()
        return success_response({"donation_id": str(donation.id), "token": raw_token, "expires_at": verification.expires_at}, "QR verification token generated.", status.HTTP_201_CREATED)


class QRVerifyView(ModelViewSet):
    serializer_class = APIResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["post", "head", "options"]

    def create(self, request, *args, **kwargs):
        donation_id = request.data.get("donation_id")
        token = request.data.get("token")
        stage = request.data.get("stage")
        if not donation_id or not token or stage not in {"PICKUP", "DELIVERY"}:
            raise ValidationError("donation_id, token, and stage (PICKUP or DELIVERY) are required.")
        with transaction.atomic():
            verification = QRVerification.objects.select_for_update().select_related("donation").filter(donation_id=donation_id).first()
            if verification is None:
                raise ValidationError("No active verification token exists.")
            task = PickupTask.objects.select_for_update().filter(donation_id=donation_id).first()
            if task is None or task.volunteer_id != request.user.id:
                raise PermissionDenied("Only the assigned volunteer can verify this transaction.")
            if verification.expires_at <= timezone.now():
                raise ValidationError("The QR verification token has expired.")
            token_hash = hashlib.sha256(str(token).encode()).hexdigest()
            if not hmac.compare_digest(token_hash, verification.token_hash):
                raise ValidationError("The QR verification token is invalid.")
            now = timezone.now()
            if stage == "PICKUP":
                if task.status != PickupTask.STATUS_PICKUP_STARTED:
                    raise ValidationError("Pickup QR can only be verified after pickup has started.")
                if verification.pickup_verified_at:
                    raise ValidationError("Pickup QR verification has already been used.")
                verification.pickup_verified_at = now
                task.status = PickupTask.STATUS_PICKED_UP
                TrackingEvent.objects.create(donation=task.donation, status="PICKED_UP", actor=request.user)
            else:
                if task.status != PickupTask.STATUS_IN_TRANSIT:
                    raise ValidationError("Delivery QR can only be verified while the delivery is in transit.")
                if not verification.pickup_verified_at or verification.delivery_verified_at:
                    raise ValidationError("Delivery can be verified once after a verified pickup.")
                verification.delivery_verified_at = now
                task.status = PickupTask.STATUS_DELIVERED
                task.completed_at = now
                task.donation.status = Donation.STATUS_COMPLETED
                task.donation.save(update_fields=["status", "updated_at"])
                profile = task.volunteer.volunteer_profile
                profile.is_available = True
                profile.save(update_fields=["is_available", "updated_at"])
                TrackingEvent.objects.create(donation=task.donation, status="DELIVERED", actor=request.user)
                award_points(task.donation.donor, 10, "DONATION_DELIVERED", task.donation_id)
                award_points(task.volunteer, 20, "DONATION_DELIVERED", task.donation_id)
                award_points(task.organization.user, 10, "DONATION_RECEIVED", task.donation_id)
                Notification.objects.create(
                    recipient=task.donation.donor,
                    notification_type="FOOD_DELIVERED",
                    title="Food delivered",
                    message=f"{task.donation.food_name} was delivered.",
                    data={"donation_id": str(task.donation_id)},
                )
            verification.save(update_fields=["pickup_verified_at", "delivery_verified_at"])
            task.save(update_fields=["status", "completed_at", "updated_at"])
        return success_response({"stage": stage, "verified_at": now}, f"{stage.title()} verified.")
