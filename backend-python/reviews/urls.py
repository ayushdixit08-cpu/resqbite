from django.urls import path

from .views import DonationReviewsView, ReviewCollectionView, UserReviewsView

urlpatterns = [
    path("", ReviewCollectionView.as_view(), name="review-collection"),
    path("user/<uuid:user_id>/", UserReviewsView.as_view(), name="user-reviews"),
    path("donation/<uuid:donation_id>/", DonationReviewsView.as_view(), name="donation-reviews"),
]
