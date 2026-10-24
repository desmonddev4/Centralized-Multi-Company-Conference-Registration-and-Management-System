import secrets
import string
import uuid

from django.db import models
from django.utils import timezone


class Registration(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Pending payment"
        CONFIRMED = "confirmed", "Confirmed"
        PAYMENT_REVIEW = "payment_review", "Payment received, needs review"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    class PaymentMethod(models.TextChoices):
        NONE = "none", "No payment required"
        PAYSTACK = "paystack", "Paystack"
        CASH = "cash", "Cash"
        MOMO = "momo", "Mobile money"

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    registration_code = models.CharField(max_length=24, unique=True, editable=False, db_index=True)
    ticket_category = models.ForeignKey("events.TicketCategory", on_delete=models.PROTECT, related_name="registrations")
    full_name = models.CharField(max_length=160)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices)
    amount_due_minor_units = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="GHS")
    payment_method = models.CharField(max_length=12, choices=PaymentMethod.choices, default=PaymentMethod.NONE)
    payment_received_at = models.DateTimeField(null=True, blank=True)
    hold_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["ticket_category", "status", "hold_expires_at"], name="reg_ticket_status_exp_idx")]

    def save(self, *args, **kwargs):
        if not self.registration_code:
            alphabet = string.ascii_uppercase + string.digits
            while True:
                code = "REG-" + "".join(secrets.choice(alphabet) for _ in range(14))
                if not Registration.objects.filter(registration_code=code).exists():
                    self.registration_code = code
                    break
        super().save(*args, **kwargs)

    @property
    def conference(self):
        return self.ticket_category.conference

    def expire_if_due(self):
        if self.status == self.Status.PENDING_PAYMENT and self.hold_expires_at and self.hold_expires_at <= timezone.now():
            self.status = self.Status.EXPIRED
            self.save(update_fields=["status", "updated_at"])
        return self

    def __str__(self):
        return f"{self.registration_code} — {self.full_name}"

