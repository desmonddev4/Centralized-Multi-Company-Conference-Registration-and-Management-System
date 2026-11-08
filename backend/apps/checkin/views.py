
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.exceptions import NotFound, ValidationError
from apps.core.permissions import HasModelPermission
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.events.models import Conference
from apps.payments.models import OfflineCollection, Payment
from apps.registrations.models import Registration
from apps.registrations.serializers import RegistrationLookupSerializer
from apps.audit.services import record_audit
from .models import CheckInRecord
from .serializers import CheckInLogSerializer, CheckInRecordSerializer


class KioskAttendanceThrottle(AnonRateThrottle):
    rate = "120/min"


class KioskAttendanceInputSerializer(serializers.Serializer):
    conference = serializers.SlugField()
    full_name = serializers.CharField(max_length=160, trim_whitespace=True)
    phone = serializers.CharField(max_length=40, trim_whitespace=True)
    job_title = serializers.CharField(max_length=160, trim_whitespace=True)
    organization = serializers.CharField(max_length=160, trim_whitespace=True)
    role = serializers.ChoiceField(choices=Registration.AttendeeRole.choices)

    def validate_full_name(self, value):
        normalized = " ".join(value.split())
        if len(normalized.split()) < 2:
            raise serializers.ValidationError("Enter your first and last name.")
        return normalized

    def validate_phone(self, value):
        digits = "".join(character for character in value if character.isdigit())
        if not 7 <= len(digits) <= 15:
            raise serializers.ValidationError("Enter a valid phone number, including its country code.")
        return value

    def validate_job_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Enter your job title.")
        return value.strip()

    def validate_organization(self, value):
        if not value.strip():
            raise serializers.ValidationError("Enter your organization.")
        return value.strip()


class KioskAttendanceView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (KioskAttendanceThrottle,)

    @transaction.atomic
    def post(self, request):
        payload = KioskAttendanceInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        now = timezone.now()
        conference = Conference.objects.filter(
            slug=data["conference"],
            status=Conference.Status.PUBLISHED,
            starts_at__lte=now,
            ends_at__gt=now,
        ).first()
        if conference is None:
            raise ValidationError({"conference": "Check-in is not open for this conference."})

        normalized_phone = "".join(character for character in data["phone"] if character.isdigit())
        normalized_name = " ".join(data["full_name"].split()).casefold()
        candidates = Registration.objects.select_for_update().filter(
            ticket_category__conference=conference,
            phone_normalized=normalized_phone,
        ).select_related("ticket_category")
        matches = [
            registration for registration in candidates
            if " ".join(registration.full_name.split()).casefold() == normalized_name
        ]
        if len(matches) != 1:
            raise ValidationError(
                "We couldn't verify a unique registration for those details. Please see the registration desk."
            )

        registration = matches[0]
        if not self._payment_is_verified(registration):
            raise ValidationError(
                "We couldn't verify a paid or complimentary registration for those details. Please see the registration desk."
            )

        registration.job_title = data["job_title"]
        registration.organization = data["organization"]
        registration.attendee_role = data["role"]
        registration.save(update_fields=["job_title", "organization", "attendee_role", "updated_at"])

        record = CheckInRecord.objects.select_for_update().filter(registration=registration).first()
        already_checked_in = record is not None
        if not record:
            record = CheckInRecord.objects.create(registration=registration)
            record_audit(
                action="check_in.kiosk_recorded",
                summary="Attendee checked in at the self-service kiosk",
                request=request,
                target_type="registration",
                target_id=registration.registration_code,
                details={"conference": conference.slug, "ticket": registration.ticket_category.name},
            )

        return Response({
            "detail": "You are checked in." if not already_checked_in else "You are already checked in.",
            "already_checked_in": already_checked_in,
            "attendee": {
                "full_name": registration.full_name,
                "phone": registration.phone,
                "job_title": registration.job_title,
                "organization": registration.organization,
                "role": registration.attendee_role,
                "conference_title": conference.title,
                "ticket_category_name": registration.ticket_category.name,
                "registration_code": registration.registration_code,
                "payment_method": registration.payment_method,
                "checked_in_at": record.checked_in_at,
            },
        }, status=status.HTTP_200_OK if already_checked_in else status.HTTP_201_CREATED)

    @staticmethod
    def _payment_is_verified(registration):
        if registration.status != Registration.Status.CONFIRMED:
            return False
        if registration.amount_due_minor_units == 0:
            return registration.payment_method == Registration.PaymentMethod.NONE
        if not registration.payment_received_at:
            return False
        if registration.payment_method == Registration.PaymentMethod.PAYSTACK:
            return Payment.objects.filter(
                registration=registration,
                status=Payment.Status.SUCCEEDED,
                amount_minor_units=registration.amount_due_minor_units,
                currency=registration.currency,
            ).exists()
        if registration.payment_method in (Registration.PaymentMethod.CASH, Registration.PaymentMethod.MOMO):
            return OfflineCollection.objects.filter(
                registration=registration,
                method=registration.payment_method,
                amount_minor_units=registration.amount_due_minor_units,
                currency=registration.currency,
            ).exists()
        return False


class CheckInLogView(generics.ListAPIView):
    permission_classes = (HasModelPermission,)
    required_permission = "checkin.view_checkinrecord"
    serializer_class = CheckInLogSerializer
    queryset = CheckInRecord.objects.select_related("checked_in_by", "registration", "registration__ticket_category", "registration__ticket_category__conference", "registration__ticket_category__conference__company")

    def get_queryset(self):
        queryset = super().get_queryset()
        conference = self.request.query_params.get("conference")
        if conference:
            queryset = queryset.filter(registration__ticket_category__conference__slug=conference)
        return queryset


class RegistrationCheckInView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "checkin.add_checkinrecord"

    def get_registration(self, code):
        registration = Registration.objects.select_related("ticket_category", "ticket_category__conference").filter(registration_code=code).first()
        if registration is None:
            raise NotFound("No registration matches that code.")
        return registration

    def get(self, request, registration_code):
        registration = self.get_registration(registration_code)
        record = CheckInRecord.objects.filter(registration=registration).select_related("checked_in_by").first()
        return Response({"registration": RegistrationLookupSerializer(registration).data, "checked_in": record is not None, "record": CheckInRecordSerializer(record).data if record else None})

    @transaction.atomic
    def post(self, request, registration_code):
        registration = Registration.objects.select_for_update().select_related("ticket_category", "ticket_category__conference").filter(registration_code=registration_code).first()
        if registration is None:
            raise NotFound("No registration matches that code.")
        if registration.status != Registration.Status.CONFIRMED:
            raise ValidationError("Only confirmed registrations can be checked in.")
        record = CheckInRecord.objects.select_for_update().filter(registration=registration).first()
        if record:
            return Response({"detail": "This attendee has already checked in.", "record": CheckInRecordSerializer(record).data}, status=status.HTTP_200_OK)
        record = CheckInRecord.objects.create(registration=registration, checked_in_by=request.user)
        record_audit(
            action="check_in.recorded", summary="Attendee checked in", request=request,
            target_type="registration", target_id=registration.registration_code,
            details={"conference": registration.ticket_category.conference.slug, "ticket": registration.ticket_category.name},
        )
        return Response({"detail": "Attendee checked in.", "record": CheckInRecordSerializer(record).data}, status=status.HTTP_201_CREATED)
