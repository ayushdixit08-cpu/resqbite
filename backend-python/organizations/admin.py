from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "verification_status", "capacity", "current_demand", "created_at")
    list_filter = ("verification_status",)
    search_fields = ("name", "user__email", "address")
