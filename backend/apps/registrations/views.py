from rest_framework import generics, viewsets, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.utils import timezone
from django.db import transaction

from apps.events.models import Conference
from apps.audit.services import record_audit
from apps.core.permissions import HasModelPermission
from .models import Registration
from .serializers import RegistrationAdminSerializer, RegistrationCreateSerializer, RegistrationLookupSerializer
from apps.ticketing.services import issue_ticket_by_id


class RegistrationThrottle(AnonRateThrottle):
    rate = "30/hour"


class PublicRegistrationCreateView(generics.CreateAPIView):
    serializer_class = RegistrationCreateSerializer
    permission_classes = (AllowAny,)
    throttle_classes = (RegistrationThrottle,)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["conference_slug"] = self.kwargs["conference_slug"]
        return context

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()
        if registration.status == Registration.Status.CONFIRMED:
            transaction.on_commit(lambda registration_id=registration.pk: issue_ticket_by_id(registration_id))
        record_audit(
            action="registration.created", summary="Public registration created", request=request,
            target_type="registration", target_id=registration.registration_code,
            details={"conference": registration.ticket_category.conference.slug, "ticket": registration.ticket_category.name, "amount_minor_units": registration.amount_due_minor_units, "currency": registration.currency},
        )
        return Response(RegistrationLookupSerializer(registration).data, status=status.HTTP_201_CREATED)


class RegistrationLookupView(generics.RetrieveAPIView):
    serializer_class = RegistrationLookupSerializer
    permission_classes = (AllowAny,)
    throttle_classes = (RegistrationThrottle,)
    lookup_field = "registration_code"
    lookup_url_kwarg = "registration_code"

    def get_queryset(self):
        return Registration.objects.select_related("ticket_category", "ticket_category__conference").all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object().expire_if_due()
        return Response(self.get_serializer(instance).data)


class RegistrationAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RegistrationAdminSerializer
    permission_classes = (HasModelPermission,)
    required_permission = "registrations.view_registration"
    queryset = Registration.objects.select_related(
        "ticket_category", "ticket_category__conference", "ticket_category__conference__company",
    ).all()

    def get_queryset(self):
        now = timezone.now()
        Registration.objects.filter(
            status=Registration.Status.PENDING_PAYMENT,
            hold_expires_at__lte=now,
        ).update(status=Registration.Status.EXPIRED, updated_at=now)
        queryset = super().get_queryset()
        event_slug = self.request.query_params.get("event")
        if event_slug:
            queryset = queryset.filter(ticket_category__conference__slug=event_slug)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset
