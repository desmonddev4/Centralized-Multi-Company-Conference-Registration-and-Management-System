from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import NotFound, ValidationError
from apps.core.permissions import HasModelPermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Conference, TicketCategory
from apps.audit.services import record_audit
from apps.payments.models import OfflineCollection
from .models import Registration
from .serializers import RegistrationLookupSerializer
from apps.ticketing.services import issue_ticket_by_id


class WalkInInputSerializer(serializers.Serializer):
    conference = serializers.SlugField()
    ticket_category = serializers.IntegerField()
    full_name = serializers.CharField(max_length=160)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=40, allow_blank=True, required=False, default="")
    payment_method = serializers.ChoiceField(choices=[("cash", "Cash"), ("momo", "Mobile money")])
    payment_reference = serializers.CharField(max_length=100, allow_blank=True, required=False, default="")

    def validate_full_name(self, value):
        words = " ".join(value.split())
        if len(words.split()) < 2:
            raise serializers.ValidationError("Enter the attendee’s full name.")
        return words

    def validate_email(self, value):
        return value.strip().lower()


class WalkInRegistrationView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "registrations.add_registration"

    @transaction.atomic
    def post(self, request):
        payload = WalkInInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        now = timezone.now()
        conference = Conference.objects.select_for_update().filter(slug=data["conference"]).first()
        if conference is None:
            raise NotFound("Conference not found.")
        if conference.status != Conference.Status.PUBLISHED or conference.ends_at <= now:
            raise ValidationError("Walk-in registration is only available for a published conference that has not ended.")
        category = TicketCategory.objects.select_for_update().filter(pk=data["ticket_category"], conference=conference, is_active=True).first()
        if category is None:
            raise ValidationError({"ticket_category": "Choose an active ticket type for this conference."})
        active = Q(status=Registration.Status.CONFIRMED) | Q(status=Registration.Status.PENDING_PAYMENT, hold_expires_at__gt=now)
        category_count = Registration.objects.filter(ticket_category=category).filter(active).count()
        event_count = Registration.objects.filter(ticket_category__conference=conference).filter(active).count()
        if category_count >= category.quantity_available or (conference.capacity is not None and event_count >= conference.capacity):
            raise ValidationError("There are no tickets remaining for this selection.")
        registration = Registration.objects.create(
            ticket_category=category, full_name=data["full_name"], email=data["email"],
            phone=data["phone"], status=Registration.Status.CONFIRMED,
            amount_due_minor_units=category.price_minor_units, currency=category.currency,
            payment_method=data["payment_method"] if category.price_minor_units else Registration.PaymentMethod.NONE,
            payment_received_at=now if category.price_minor_units else None,
        )
        if registration.amount_due_minor_units and registration.payment_received_at:
            OfflineCollection.objects.create(
                registration=registration, method=registration.payment_method,
                amount_minor_units=registration.amount_due_minor_units, currency=registration.currency,
                receipt_reference=data["payment_reference"].strip(), received_by=request.user, received_at=now,
            )
        transaction.on_commit(lambda registration_id=registration.pk: issue_ticket_by_id(registration_id))
        record_audit(
            action="walk_in.registration_created", summary="Walk-in registration created", request=request,
            target_type="registration", target_id=registration.registration_code,
            details={"conference": conference.slug, "ticket": category.name, "amount_minor_units": registration.amount_due_minor_units, "currency": registration.currency, "payment_method": registration.payment_method},
        )
        return Response(RegistrationLookupSerializer(registration).data, status=status.HTTP_201_CREATED)
