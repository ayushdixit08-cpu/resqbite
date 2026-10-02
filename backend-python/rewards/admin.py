from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import Badge, Reward, UserBadge

admin.site.register((Badge, Reward, UserBadge))
