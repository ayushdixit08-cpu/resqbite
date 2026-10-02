from django.shortcuts import render

# Create your views here.
import os

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from accounts.models import User
from common.responses import success_response
from donations.models import Donation
from organizations.models import Organization
from pickups.models import PickupTask
from volunteers.models import VolunteerProfile


class AnalyticsOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
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
            data = {
                "active_deliveries": tasks.exclude(status__in=["DELIVERED", "CANCELLED"]).count(),
                "completed_deliveries": tasks.filter(status="DELIVERED").count(),
                "distance_travelled_km": 0,
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


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_ADMIN:
            raise PermissionDenied("Administrator role is required.")
        return success_response(AnalyticsOverviewView._admin_metrics())
