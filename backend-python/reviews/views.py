from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from common.views import ResQBiteAPIView as APIView
from django.db import IntegrityError

from common.pagination import ResQBitePagination
from common.responses import success_response
from donations.models import Donation
from pickups.models import PickupTask

from .models import Review
from .serializers import ReviewSerializer


class ReviewCollectionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Review.objects.select_related("reviewer", "reviewed_user", "donation")
        if request.user.role != "ADMIN":
            queryset = queryset.filter(reviewed_user=request.user) | queryset.filter(reviewer=request.user)
        paginator = ResQBitePagination()
        page = paginator.paginate_queryset(queryset.distinct(), request, view=self)
        if page is not None:
            return paginator.get_paginated_response(ReviewSerializer(page, many=True).data)
        return success_response(ReviewSerializer(queryset.distinct(), many=True).data)

    def post(self, request):
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donation = serializer.validated_data["donation"]
        reviewed_user = serializer.validated_data["reviewed_user"]
        if donation.status != Donation.STATUS_COMPLETED:
            raise ValidationError("Reviews are allowed only after donation completion.")

        participants = {donation.donor_id}
        if donation.organization_id:
            participants.add(donation.organization.user_id)
        participants.update(PickupTask.objects.filter(donation=donation, volunteer__isnull=False).values_list("volunteer_id", flat=True))
        if request.user.id not in participants or reviewed_user.id not in participants or reviewed_user.id == request.user.id:
            raise PermissionDenied("Only different participants in the completed donation can review each other.")
        try:
            review = serializer.save(reviewer=request.user)
        except IntegrityError as exc:
            raise ValidationError("You already reviewed this participant for this donation.") from exc
        return success_response(ReviewSerializer(review).data, "Review submitted.", status.HTTP_201_CREATED)


class UserReviewsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        queryset = Review.objects.filter(reviewed_user_id=user_id).select_related("reviewer", "reviewed_user", "donation")
        paginator = ResQBitePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(ReviewSerializer(page, many=True).data)
        return success_response(ReviewSerializer(queryset, many=True).data)


class DonationReviewsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, donation_id):
        donation = Donation.objects.filter(pk=donation_id).first()
        if donation is None:
            return Response({"detail": "Donation not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != "ADMIN" and donation.donor_id != request.user.id and not PickupTask.objects.filter(donation=donation, organization__user=request.user).exists() and not PickupTask.objects.filter(donation=donation, volunteer=request.user).exists():
            raise PermissionDenied()
        queryset = Review.objects.filter(donation=donation).select_related("reviewer", "reviewed_user")
        return success_response(ReviewSerializer(queryset, many=True).data)
