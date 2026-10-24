
from django.db import transaction
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from apps.core.permissions import HasModelPermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.registrations.models import Registration
from apps.registrations.serializers import RegistrationLookupSerializer
from apps.audit.services import record_audit
from .models import CheckInRecord
from .serializers import CheckInLogSerializer, CheckInRecordSerializer


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
        record = CheckInRecord.objects.select_for_update().filter(registration=registration).select_related("checked_in_by").first()
        if record:
            return Response({"detail": "This attendee has already checked in.", "record": CheckInRecordSerializer(record).data}, status=status.HTTP_200_OK)
        record = CheckInRecord.objects.create(registration=registration, checked_in_by=request.user)
        record_audit(
            action="check_in.recorded", summary="Attendee checked in", request=request,
            target_type="registration", target_id=registration.registration_code,
            details={"conference": registration.ticket_category.conference.slug, "ticket": registration.ticket_category.name},
        )
        return Response({"detail": "Attendee checked in.", "record": CheckInRecordSerializer(record).data}, status=status.HTTP_201_CREATED)
