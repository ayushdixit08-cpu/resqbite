from django.urls import path

from .views import BadgeListView, LeaderboardView, MyRewardsView

urlpatterns = [
    path("me/", MyRewardsView.as_view(), name="my-rewards"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path("badges/", BadgeListView.as_view(), name="badges"),
]
