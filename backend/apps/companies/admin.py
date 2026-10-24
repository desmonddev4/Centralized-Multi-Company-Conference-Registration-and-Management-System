from django.contrib import admin
from .models import Company

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_email", "is_active", "updated_at")
    search_fields = ("name", "contact_email")
    list_filter = ("is_active",)
    readonly_fields = ("created_at", "updated_at")
