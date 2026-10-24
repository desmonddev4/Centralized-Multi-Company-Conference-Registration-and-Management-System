import uuid

from django.db import models
from django.db.models import Q
from django.utils.text import slugify
from django.utils import timezone
from apps.companies.models import Company


class Conference(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CANCELLED = "cancelled", "Cancelled"
        ARCHIVED = "archived", "Archived"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="conferences")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    banner_url = models.URLField(blank=True)
    venue_name = models.CharField(max_length=180, blank=True)
    venue_address = models.CharField(max_length=300, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    registration_opens_at = models.DateTimeField(null=True, blank=True)
    registration_closes_at = models.DateTimeField(null=True, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at", "title"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:190] or str(self.public_id)[:8]
            candidate = base
            index = 2
            while Conference.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
                candidate = f"{base}-{index}"
                index += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class TicketCategory(models.Model):
    conference = models.ForeignKey(Conference, on_delete=models.CASCADE, related_name="ticket_categories")
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=300, blank=True)
    price_minor_units = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="GHS")
    quantity_available = models.PositiveIntegerField()
    max_per_registration = models.PositiveSmallIntegerField(default=1)
    sales_open_at = models.DateTimeField(null=True, blank=True)
    sales_close_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "price_minor_units", "name"]
        constraints = [models.UniqueConstraint(fields=["conference", "name"], name="unique_ticket_name_per_conference")]

    @property
    def remaining_quantity(self):
        now = timezone.now()
        reserved = self.registrations.filter(
            Q(status="confirmed") | Q(status="pending_payment", hold_expires_at__gt=now),
        ).count()
        return max(0, self.quantity_available - reserved)

    def __str__(self):
        return f"{self.name} — {self.conference.title}"


class AgendaSession(models.Model):
    conference = models.ForeignKey(Conference, on_delete=models.CASCADE, related_name="agenda_sessions")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    speaker_name = models.CharField(max_length=160, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    venue_name = models.CharField(max_length=180, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at", "sort_order", "title"]

    def __str__(self):
        return f"{self.title} — {self.conference.title}"
