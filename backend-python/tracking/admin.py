from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import TrackingEvent, VolunteerLocation

admin.site.register((TrackingEvent, VolunteerLocation))
