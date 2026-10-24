from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.registrations.models import Registration
from apps.core.permissions import HasModelPermission
from apps.audit.services import record_audit
from .permissions import ConfirmedTicketPermission
from .serializers import IssuedTicketSerializer, TicketDeliveryQueueSerializer, TicketDeliverySerializer
from .services import deliver_ticket_email, issue_ticket
from .models import IssuedTicket


class TicketDeliveryListView(generics.ListAPIView):
    permission_classes = (HasModelPermission,)
    required_permission = "registrations.view_registration"
    serializer_class = TicketDeliveryQueueSerializer
    queryset = Registration.objects.select_related("issued_ticket", "ticket_category", "ticket_category__conference", "ticket_category__conference__company").filter(status=Registration.Status.CONFIRMED)


class TicketEmailResendView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "registrations.change_registration"

    def post(self, request, registration_code):
        registration = Registration.objects.select_related("ticket_category", "ticket_category__conference", "ticket_category__conference__company").filter(registration_code=registration_code).first()
        if registration is None:
            raise NotFound("Registration was not found.")
        if registration.status != Registration.Status.CONFIRMED:
            raise ValidationError("Ticket emails can only be sent for confirmed registrations.")
        ticket, created = IssuedTicket.objects.get_or_create(registration=registration)
        if created:
            record_audit(action="ticket.issued", summary="Attendee ticket issued", request=request, target_type="registration", target_id=registration.registration_code)
        deliver_ticket_email(ticket)
        ticket.refresh_from_db()
        record_audit(action="ticket.email_resent", summary="Ticket email resend attempted", request=request, target_type="registration", target_id=registration.registration_code, details={"delivered": bool(ticket.email_sent_at), "issued_at": ticket.issued_at.isoformat()})
        return Response(TicketDeliverySerializer(ticket).data, status=status.HTTP_200_OK)


class TicketThrottle(AnonRateThrottle):
    rate = "30/hour"


class TicketView(APIView):
    permission_classes = (AllowAny, ConfirmedTicketPermission)
    throttle_classes = (TicketThrottle,)

    def get(self, request, registration_code):
        registration = Registration.objects.select_related("ticket_category", "ticket_category__conference").filter(registration_code=registration_code).first()
        if registration is None:
            raise NotFound("Ticket was not found.")
        registration.expire_if_due()
        self.check_object_permissions(request, registration)
        ticket = issue_ticket(registration)
        return Response(IssuedTicketSerializer(ticket).data)
