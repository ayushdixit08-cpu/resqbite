from django.urls import path

from .views import AIServiceUnavailableView

urlpatterns = [
    path("food-quality/", AIServiceUnavailableView.as_view(), name="food-quality"),
    path("meal-estimation/", AIServiceUnavailableView.as_view(), name="meal-estimation"),
    path("ngo-recommendation/", AIServiceUnavailableView.as_view(), name="ngo-recommendation"),
    path("expiry-prediction/", AIServiceUnavailableView.as_view(), name="expiry-prediction"),
    path("chat/", AIServiceUnavailableView.as_view(), name="ai-chat"),
]
