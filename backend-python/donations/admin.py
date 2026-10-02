from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import Donation, DonationImage, DonationRequest, FoodSafetyChecklist, QRVerification


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ("food_name", "donor", "category", "quantity", "status", "expires_at")
    list_filter = ("status", "category")
    search_fields = ("food_name", "donor__email")


admin.site.register((DonationImage, DonationRequest, FoodSafetyChecklist, QRVerification))
