import uuid

from django.db import models
from django.conf import settings
from apps.registrations.models import Registration


class OfflineCollection(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        MOMO = "momo", "Mobile money"

    registration = models.OneToOneField(Registration, on_delete=models.PROTECT, related_name="offline_collection")
    method = models.CharField(max_length=4, choices=Method.choices)
    amount_minor_units = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3)
    receipt_reference = models.CharField(max_length=100, blank=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="offline_collections")
    received_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at", "-id"]

    def __str__(self):
        return f"{self.registration.registration_code} — {self.method}"


class Payment(models.Model):
    class Status(models.TextChoices):
        INITIALIZING = "initializing", "Initializing"
        INITIALIZED = "initialized", "Initialized"
        PENDING = "pending", "Pending"
        FAILED = "failed", "Failed"
        ABANDONED = "abandoned", "Abandoned"
        SUCCEEDED = "succeeded", "Succeeded"
        REVIEW = "review", "Needs review"

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    registration = models.ForeignKey(Registration, on_delete=models.PROTECT, related_name="payments")
    reference = models.CharField(max_length=80, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIALIZING)
    amount_minor_units = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3)
    authorization_url = models.URLField(max_length=500, blank=True)
    access_code = models.CharField(max_length=100, blank=True)
    paystack_transaction_id = models.PositiveBigIntegerField(null=True, blank=True)
    gateway_response = models.CharField(max_length=400, blank=True)
    initialized_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["registration", "status"], name="payment_reg_status_idx")]

    def __str__(self):
        return f"{self.reference} — {self.status}"


class PaystackWebhookEvent(models.Model):
    class Status(models.TextChoices):
        RECEIVED = "received", "Received"
        PROCESSING = "processing", "Processing"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    id = models.BigAutoField(primary_key=True)
    payload_digest = models.CharField(max_length=64, unique=True)
    event_type = models.CharField(max_length=80)
    reference = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RECEIVED)
    error_message = models.CharField(max_length=300, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return f"{self.event_type} — {self.status}"


class Refund(models.Model):
    class Method(models.TextChoices):
        PAYSTACK = "paystack", "Paystack"
        CASH = "cash", "Cash"
        MOMO = "momo", "Mobile money"

    class Status(models.TextChoices):
        INITIALIZING = "initializing", "Submitting"
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"
        NEEDS_ATTENTION = "needs_attention", "Needs attention"
        REVERSED = "reversed", "Reversed"
        UNKNOWN = "unknown", "Needs reconciliation"

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    registration = models.ForeignKey(Registration, on_delete=models.PROTECT, related_name="refunds")
    payment = models.ForeignKey(Payment, null=True, blank=True, on_delete=models.PROTECT, related_name="refunds")
    method = models.CharField(max_length=12, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    amount_minor_units = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3)
    reason = models.CharField(max_length=300)
    paystack_refund_id = models.PositiveBigIntegerField(null=True, blank=True, unique=True)
    gateway_message = models.CharField(max_length=400, blank=True)
    expected_at = models.DateTimeField(null=True, blank=True)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_refunds")
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="completed_refunds")
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["registration", "status"], name="refund_reg_status_idx")]

    def __str__(self):
        return f"{self.public_id} — {self.status}"


class Settlement(models.Model):
    paystack_id = models.PositiveBigIntegerField(unique=True)
    status = models.CharField(max_length=20)
    currency = models.CharField(max_length=3)
    total_amount_minor_units = models.PositiveBigIntegerField(default=0)
    effective_amount_minor_units = models.PositiveBigIntegerField(default=0)
    total_fees_minor_units = models.PositiveBigIntegerField(default=0)
    total_processed_minor_units = models.PositiveBigIntegerField(default=0)
    settlement_date = models.DateTimeField(null=True, blank=True)
    source_data = models.JSONField(default=dict, blank=True)
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-settlement_date", "-paystack_id"]

    def __str__(self):
        return f"Paystack settlement {self.paystack_id} — {self.status}"


class SettlementTransaction(models.Model):
    settlement = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name="transactions")
    paystack_id = models.PositiveBigIntegerField()
    reference = models.CharField(max_length=80, db_index=True)
    status = models.CharField(max_length=30)
    amount_minor_units = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3)
    channel = models.CharField(max_length=40, blank=True)
    message = models.CharField(max_length=300, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment = models.ForeignKey(Payment, null=True, blank=True, on_delete=models.SET_NULL, related_name="settlement_entries")
    source_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-paid_at", "-paystack_id"]
        constraints = [models.UniqueConstraint(fields=["settlement", "paystack_id"], name="unique_settlement_transaction")]

    def __str__(self):
        return f"{self.reference} in settlement {self.settlement.paystack_id}"
