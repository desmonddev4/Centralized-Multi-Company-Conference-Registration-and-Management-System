from django.conf import settings
from django.contrib import admin
from .models import Payment, PaystackWebhookEvent, Refund, Settlement, SettlementTransaction

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("reference", "registration", "amount_minor_units", "currency", "status", "paid_at")
    list_filter = ("status", "currency")
    search_fields = ("reference", "registration__registration_code", "registration__full_name", "registration__email")
    readonly_fields = ("public_id", "reference", "status", "amount_minor_units", "currency", "authorization_url", "access_code", "paystack_transaction_id", "gateway_response", "initialized_at", "paid_at", "created_at", "updated_at")

@admin.register(PaystackWebhookEvent)
class PaystackWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "reference", "status", "received_at", "processed_at")
    list_filter = ("status", "event_type")
    search_fields = ("reference", "payload_digest")
    readonly_fields = ("payload_digest", "event_type", "reference", "status", "error_message", "received_at", "processed_at")


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("registration", "method", "amount_minor_units", "currency", "status", "requested_by", "created_at")
    list_filter = ("method", "status", "currency")
    search_fields = ("registration__registration_code", "registration__full_name", "paystack_refund_id")
    readonly_fields = tuple(field.name for field in Refund._meta.fields)


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ("paystack_id", "settlement_date", "status", "currency", "effective_amount_minor_units", "synced_at")
    list_filter = ("status", "currency")
    readonly_fields = tuple(field.name for field in Settlement._meta.fields)


@admin.register(SettlementTransaction)
class SettlementTransactionAdmin(admin.ModelAdmin):
    list_display = ("paystack_id", "settlement", "reference", "status", "amount_minor_units", "currency", "payment")
    list_filter = ("status", "currency", "channel")
    search_fields = ("reference", "payment__registration__registration_code")
    readonly_fields = tuple(field.name for field in SettlementTransaction._meta.fields)
