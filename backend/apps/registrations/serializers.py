from django.db import transaction
from rest_framework import serializers
from apps.events.models import Conference, TicketCategory
from .models import Registration


class RegistrationCreateSerializer(serializers.Serializer):
    ticket_category = serializers.IntegerField()
    full_name = serializers.CharField(max_length=160, trim_whitespace=True)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=40, allow_blank=True, required=False, default="")

    def validate_full_name(self, value):
        if len(value.split()) < 2:
            raise serializers.ValidationError("Enter the attendee’s full name.")
        return " ".join(value.split())

    def validate_email(self, value):
        return value.strip().lower()

    @transaction.atomic
    def create(self, validated_data):
        from datetime import timedelta
        from django.db import transaction
        from django.db.models import Q
        from django.utils import timezone
        from apps.core.models import PlatformSettings

        now = timezone.now()
        try:
            conference = Conference.objects.select_for_update().get(slug=self.context["conference_slug"])
        except Conference.DoesNotExist:
            raise serializers.ValidationError("This conference is no longer available.")
        category = TicketCategory.objects.select_for_update().filter(
            pk=validated_data["ticket_category"],
            conference=conference,
        ).first()
        if category is None:
            raise serializers.ValidationError({"ticket_category": "Choose a ticket type for this conference."})
        if conference.status != Conference.Status.PUBLISHED:
            raise serializers.ValidationError("Registration is not open for this conference.")
        if conference.starts_at <= now:
            raise serializers.ValidationError("Registration has closed because the conference has started.")
        if conference.registration_opens_at and conference.registration_opens_at > now:
            raise serializers.ValidationError("Registration has not opened yet.")
        if conference.registration_closes_at and conference.registration_closes_at <= now:
            raise serializers.ValidationError("Registration has closed.")
        if not category.is_active:
            raise serializers.ValidationError({"ticket_category": "This ticket type is no longer available."})
        if category.sales_open_at and category.sales_open_at > now:
            raise serializers.ValidationError({"ticket_category": "Sales for this ticket type have not opened yet."})
        if category.sales_close_at and category.sales_close_at <= now:
            raise serializers.ValidationError({"ticket_category": "Sales for this ticket type have closed."})

        active_reservations = Q(status=Registration.Status.CONFIRMED) | Q(
            status=Registration.Status.PENDING_PAYMENT,
            hold_expires_at__gt=now,
        )
        category_reserved = Registration.objects.filter(ticket_category=category).filter(active_reservations).count()
        if category_reserved >= category.quantity_available:
            raise serializers.ValidationError({"ticket_category": "This ticket type is sold out."})
        if conference.capacity is not None:
            conference_reserved = Registration.objects.filter(
                ticket_category__conference=conference,
            ).filter(active_reservations).count()
            if conference_reserved >= conference.capacity:
                raise serializers.ValidationError({"ticket_category": "This conference has reached its capacity."})

        is_free = category.price_minor_units == 0
        hold_minutes = PlatformSettings.get_solo().registration_hold_minutes
        expires_at = None if is_free else now + timedelta(minutes=hold_minutes)
        return Registration.objects.create(
            ticket_category=category,
            full_name=validated_data["full_name"],
            email=validated_data["email"],
            phone=validated_data.get("phone", ""),
            status=Registration.Status.CONFIRMED if is_free else Registration.Status.PENDING_PAYMENT,
            amount_due_minor_units=category.price_minor_units,
            currency=category.currency,
            hold_expires_at=expires_at,
        )


class RegistrationLookupSerializer(serializers.ModelSerializer):
    conference_title = serializers.CharField(source="ticket_category.conference.title", read_only=True)
    conference_slug = serializers.CharField(source="ticket_category.conference.slug", read_only=True)
    ticket_category_name = serializers.CharField(source="ticket_category.name", read_only=True)
    starts_at = serializers.DateTimeField(source="ticket_category.conference.starts_at", read_only=True)

    class Meta:
        model = Registration
        fields = (
            "registration_code", "full_name", "status", "amount_due_minor_units", "currency",
            "hold_expires_at", "created_at", "conference_title", "conference_slug",
            "ticket_category_name", "starts_at",
        )


class RegistrationAdminSerializer(RegistrationLookupSerializer):
    company_name = serializers.CharField(source="ticket_category.conference.company.name", read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)
    payment_method = serializers.CharField(read_only=True)
    payment_received_at = serializers.DateTimeField(read_only=True)

    class Meta(RegistrationLookupSerializer.Meta):
        fields = RegistrationLookupSerializer.Meta.fields + ("company_name", "email", "phone", "payment_method", "payment_received_at")


