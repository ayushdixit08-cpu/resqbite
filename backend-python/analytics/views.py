

# Create your views here.
import os
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from common.views import ResQBiteAPIView as APIView

from accounts.models import User
from common.responses import success_response
from donations.models import Donation
from organizations.models import Organization
from pickups.models import PickupTask
from volunteers.models import VolunteerProfile
from common.services import haversine_km


def weekly_meal_totals(donations, days=7):
    start = timezone.now() - timedelta(days=days - 1)
    rows = (
        donations.filter(status=Donation.STATUS_COMPLETED, updated_at__date__gte=start.date())
        .annotate(day=TruncDate("updated_at"))
        .values("day")
        .annotate(meals=Sum("people_served"))
        .order_by("day")
    )
    values = {row["day"]: row["meals"] for row in rows}
    return [
        {
            "d": (start.date() + timedelta(days=index)).strftime("%a"),
            "date": (start.date() + timedelta(days=index)).isoformat(),
            "meals": values.get(start.date() + timedelta(days=index), 0),
        }
        for index in range(days)
    ]


class AnalyticsOverviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        if user is None:
            return success_response(self._public_metrics())
        if user.role == User.ROLE_DONOR:
            donations = Donation.objects.filter(donor=user)
            data = {
                "active_donations": donations.filter(status__in=["PENDING", "ACCEPTED"]).count(),
                "completed_donations": donations.filter(status=Donation.STATUS_COMPLETED).count(),
                "cancelled_donations": donations.filter(status=Donation.STATUS_CANCELLED).count(),
                "meals_donated": donations.filter(status=Donation.STATUS_COMPLETED).aggregate(total=Sum("people_served"))["total"] or 0,
                "monthly": list(donations.annotate(month=TruncMonth("created_at")).values("month").annotate(count=Count("id")).order_by("month")),
            }
        elif user.role == User.ROLE_NGO:
            organization = Organization.objects.filter(user=user).first()
            if organization is None:
                data = {"received_donations": 0, "pending_requests": 0, "completed_donations": 0, "monthly": []}
            else:
                donations = Donation.objects.filter(organization=organization)
                data = {
                    "received_donations": donations.count(),
                    "pending_requests": organization.donation_requests.filter(status="PENDING").count(),
                    "completed_donations": donations.filter(status=Donation.STATUS_COMPLETED).count(),
                    "monthly": list(donations.annotate(month=TruncMonth("created_at")).values("month").annotate(count=Count("id")).order_by("month")),
                }
        elif user.role == User.ROLE_VOLUNTEER:
            tasks = PickupTask.objects.filter(volunteer=user)
            profile = VolunteerProfile.objects.filter(user=user).first()
            completed_tasks = tasks.filter(status="DELIVERED")
            distance_travelled = 0.0
            for task in completed_tasks:
                if all(value is not None for value in (
                    task.pickup_latitude, task.pickup_longitude,
                    task.delivery_latitude, task.delivery_longitude,
                )):
                    distance_travelled += haversine_km(
                        task.pickup_latitude, task.pickup_longitude,
                        task.delivery_latitude, task.delivery_longitude,
                    )
            data = {
                "active_deliveries": tasks.exclude(status__in=["DELIVERED", "CANCELLED"]).count(),
                "completed_deliveries": tasks.filter(status="DELIVERED").count(),
                "distance_travelled_km": round(distance_travelled, 2),
                "points": profile.points if profile else 0,
            }
        elif user.role == User.ROLE_ADMIN:
            data = self._admin_metrics()
        else:
            raise PermissionDenied()
        return success_response(data)

    @staticmethod
    def _admin_metrics():
        completed = Donation.objects.filter(status=Donation.STATUS_COMPLETED)
        total = Donation.objects.count()
        return {
            "total_users": User.objects.count(),
            "total_ngos": Organization.objects.count(),
            "verified_ngos": Organization.objects.filter(verification_status="VERIFIED").count(),
            "total_donations": total,
            "food_rescued_quantity": completed.aggregate(total=Sum("quantity"))["total"] or 0,
            "meals_provided": completed.aggregate(total=Sum("people_served"))["total"] or 0,
            "active_volunteers": VolunteerProfile.objects.filter(is_available=True).count(),
            "completion_rate": round(completed.count() * 100 / total, 2) if total else 0,
        }

    @staticmethod
    def _public_metrics():
        metrics = AnalyticsOverviewView._admin_metrics()
        return {
            **metrics,
            "mealsRescued": metrics["meals_provided"],
            "verifiedNgoCount": metrics["verified_ngos"],
            "volunteerCount": VolunteerProfile.objects.count(),
            "totalDonations": metrics["total_donations"],
            "activeDonations": Donation.objects.filter(status__in=["PENDING", "ACCEPTED"]).count(),
            "inTransit": PickupTask.objects.filter(status="IN_TRANSIT").count(),
            "deliveredDonations": Donation.objects.filter(status=Donation.STATUS_COMPLETED).count(),
        }


class EnvironmentalImpactView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        completed = Donation.objects.filter(status=Donation.STATUS_COMPLETED)
        quantity_kg = float(completed.aggregate(total=Sum("quantity"))["total"] or 0)
        kg_factor = float(os.getenv("IMPACT_CO2_KG_PER_KG_FOOD", "2.5"))
        water_factor = float(os.getenv("IMPACT_WATER_LITERS_PER_KG_FOOD", "1000"))
        return success_response({
            "estimate": True,
            "food_waste_reduced_kg": round(quantity_kg, 2),
            "co2_avoided_kg": round(quantity_kg * kg_factor, 2),
            "water_saved_liters": round(quantity_kg * water_factor, 2),
            "factors": {"co2_kg_per_kg_food": kg_factor, "water_liters_per_kg_food": water_factor},
        })


class AnalyticsWeeklyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 7))
            if days < 1 or days > 90:
                raise ValueError
        except ValueError as exc:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"days": "Days must be between 1 and 90."}) from exc
        return success_response({"weekly": weekly_meal_totals(Donation.objects.all(), days)})


class AnalyticsFoodMixView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        rows = (
            Donation.objects.filter(status=Donation.STATUS_COMPLETED)
            .values("category")
            .annotate(value=Sum("people_served"))
            .order_by("-value")
        )
        return success_response({"foodMix": [{"name": row["category"], "value": row["value"]} for row in rows]})


class AnalyticsStatusBreakdownView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        donations = Donation.objects.all()
        if request.user.role == User.ROLE_DONOR:
            donations = donations.filter(donor=request.user)
        elif request.user.role == User.ROLE_NGO:
            donations = donations.filter(organization__user=request.user)
        elif request.user.role not in {User.ROLE_ADMIN, User.ROLE_VOLUNTEER}:
            raise PermissionDenied()
        values = list(donations.values("status").annotate(value=Count("id")).order_by("status"))
        return success_response({"statusBreakdown": values})


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == User.ROLE_DONOR:
            donations = Donation.objects.filter(donor=request.user)
        elif request.user.role == User.ROLE_NGO:
            donations = Donation.objects.filter(organization__user=request.user)
        elif request.user.role == User.ROLE_VOLUNTEER:
            task_donations = PickupTask.objects.filter(volunteer=request.user).values("donation_id")
            donations = Donation.objects.filter(id__in=task_donations)
        elif request.user.role == User.ROLE_ADMIN:
            donations = Donation.objects.all()
        else:
            raise PermissionDenied()
        total = donations.count()
        completed = donations.filter(status=Donation.STATUS_COMPLETED)
        stats = {
            "activeDonations": donations.filter(status__in=["PENDING", "ACCEPTED"]).count(),
            "inTransit": PickupTask.objects.filter(donation__in=donations, status="IN_TRANSIT").count(),
            "mealsDonated": completed.aggregate(total=Sum("people_served"))["total"] or 0,
            "deliveredDonations": completed.count(),
            "totalDonations": total,
        }
        from rewards.models import Reward

        stats["rescuePoints"] = Reward.objects.filter(user=request.user).aggregate(total=Sum("points"))["total"] or 0
        stats["todayDonations"] = donations.filter(created_at__date=timezone.localdate()).count()
        previous_week = donations.filter(
            status=Donation.STATUS_COMPLETED,
            updated_at__date__gte=timezone.localdate() - timedelta(days=14),
            updated_at__date__lt=timezone.localdate() - timedelta(days=7),
        ).aggregate(total=Sum("people_served"))["total"] or 0
        this_week = donations.filter(
            status=Donation.STATUS_COMPLETED,
            updated_at__date__gte=timezone.localdate() - timedelta(days=7),
        ).aggregate(total=Sum("people_served"))["total"] or 0
        stats["tier"] = "Gold" if stats["rescuePoints"] >= 1000 else "Silver" if stats["rescuePoints"] >= 250 else "Bronze"
        weekly_change = round((this_week - previous_week) * 100 / previous_week, 1) if previous_week else 0
        return success_response({
            "stats": stats,
            "weeklyMeals": weekly_meal_totals(donations, 7),
            "weeklyChange": weekly_change,
        })


class AnalyticsTopOrganizationsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 5))
            if not 1 <= limit <= 50:
                raise ValueError
        except ValueError as exc:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"limit": "Limit must be between 1 and 50."}) from exc
        rows = (
            Donation.objects.filter(status=Donation.STATUS_COMPLETED, organization__isnull=False)
            .values("organization_id", "organization__name")
            .annotate(meals=Sum("people_served"), donations=Count("id"))
            .order_by("-meals")[:limit]
        )
        return success_response({"topNgos": list(rows)})


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Administrator role is required.")
        return success_response(AnalyticsOverviewView._admin_metrics())


class AdminUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Administrator role is required.")
        from accounts.serializers import UserSerializer

        users = User.objects.all().order_by("-created_at")
        role = request.query_params.get("role")
        if role:
            users = users.filter(role=role.upper())
        return success_response(UserSerializer(users[:500], many=True).data)


class AdminDeactivateUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Administrator role is required.")
        target = User.objects.filter(pk=user_id).first()
        if target is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("User not found.")
        if target.pk == request.user.pk:
            raise PermissionDenied("Administrators cannot deactivate their own account.")
        target.is_active = False
        target.save(update_fields=["is_active"])
        return success_response({"id": str(target.id), "is_active": target.is_active}, "User deactivated.")


class AdminDonationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Administrator role is required.")
        donations = Donation.objects.select_related("donor", "organization").order_by("-created_at")
        return success_response(list(donations.values("id", "food_name", "status", "donor__email", "organization__name", "created_at")[:500]))


class AdminDeliveryListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Administrator role is required.")
        tasks = PickupTask.objects.select_related("donation", "organization", "volunteer").order_by("-assigned_at")
        return success_response(list(tasks.values("id", "donation_id", "organization__name", "volunteer__email", "status", "assigned_at", "completed_at")[:500]))


class AdminReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Administrator role is required.")
        from complaints.models import Complaint, FraudAlert

        return success_response({
            "metrics": AnalyticsOverviewView._admin_metrics(),
            "open_complaints": Complaint.objects.filter(status=Complaint.STATUS_OPEN).count(),
            "unreviewed_fraud_alerts": FraudAlert.objects.filter(reviewed=False).count(),
        })
