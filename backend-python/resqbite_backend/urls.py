from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, reverse_lazy
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common.views import HealthView
from analytics.views import DashboardView

urlpatterns = [
    path("", RedirectView.as_view(url=reverse_lazy("swagger-ui"), permanent=False), name="home"),
    path("admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/", include("accounts.urls")),
    path("api/dashboard", DashboardView.as_view(), name="dashboard-compat"),
    path("api/ngos/", include("organizations.urls")),
    path("api/organizations/", include("organizations.urls")),
    path("api/donations/", include("donations.urls")),
    path("api/donation-requests/", include("donations.request_urls")),
    path("api/pickups/", include("pickups.urls")),
    path("api/volunteers/", include("volunteers.urls")),
    path("api/tracking/", include("tracking.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/rewards/", include("rewards.urls")),
    path("api/complaints/", include("complaints.urls")),
    path("api/emergency-requests/", include("emergency_requests.urls")),
    path("api/events/", include("events.urls")),
    path("api/admin/", include("common.admin_urls")),
    path("api/ai/", include("ai_services.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
