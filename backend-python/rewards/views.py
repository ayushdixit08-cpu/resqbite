from django.db.models import Sum
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from common.responses import success_response

from .models import Badge, Reward, UserBadge
from .serializers import BadgeSerializer, RewardSerializer, UserBadgeSerializer


class MyRewardsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rewards = Reward.objects.filter(user=request.user)
        return success_response({
            "total_points": rewards.aggregate(total=Sum("points"))["total"] or 0,
            "entries": RewardSerializer(rewards, many=True).data,
            "badges": UserBadgeSerializer(UserBadge.objects.filter(user=request.user).select_related("badge"), many=True).data,
        })


class LeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = Reward.objects.values("user_id", "user__name", "user__role").annotate(points=Sum("points")).order_by("-points")[:100]
        return success_response(list(users))


class BadgeListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return success_response(BadgeSerializer(Badge.objects.all().order_by("points_required"), many=True).data)
