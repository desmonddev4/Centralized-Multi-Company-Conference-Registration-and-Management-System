from django.contrib import admin
from .models import Conference, TicketCategory

class TicketCategoryInline(admin.TabularInline):
    model = TicketCategory
    extra = 0

@admin.register(Conference)
class ConferenceAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "starts_at", "status", "capacity")
    list_filter = ("status", "company")
    search_fields = ("title", "company__name", "venue_name")
    prepopulated_fields = {"slug": ("title",)}
    inlines = (TicketCategoryInline,)
    readonly_fields = ("public_id", "created_at", "updated_at")

@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "conference", "price_minor_units", "currency", "quantity_available", "is_active")
    list_filter = ("currency", "is_active")
    search_fields = ("name", "conference__title")
