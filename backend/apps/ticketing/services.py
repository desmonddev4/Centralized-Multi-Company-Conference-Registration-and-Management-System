import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_audit
from apps.registrations.models import Registration
from .models import IssuedTicket

logger = logging.getLogger(__name__)


def issue_ticket(registration):
    if registration.status != Registration.Status.CONFIRMED:
        return None
    ticket, created = IssuedTicket.objects.get_or_create(registration=registration)
    if created:
        record_audit(action="ticket.issued", summary="Attendee ticket issued", target_type="registration", target_id=registration.registration_code)
    if not ticket.email_sent_at:
        deliver_ticket_email(ticket)
    return ticket


def issue_ticket_by_id(registration_id):
    registration = Registration.objects.select_related("ticket_category", "ticket_category__conference").filter(pk=registration_id).first()
    if registration:
        issue_ticket(registration)


def deliver_ticket_email(ticket):
    registration = ticket.registration
    link = settings.FRONTEND_URL.rstrip("/") + "/tickets/" + registration.registration_code
    subject = f"Your ticket for {registration.ticket_category.conference.title}"
    message = (f"Hello {registration.full_name},\n\nYour registration is confirmed. "
               f"View your ticket and QR code here:\n{link}\n\n"
               f"Your registration code is {registration.registration_code}. Keep it available for check-in.")
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [registration.email], fail_silently=False)
        ticket.email_sent_at = timezone.now()
        ticket.email_error = ""
        ticket.save(update_fields=["email_sent_at", "email_error"])
    except Exception as exc:
        logger.exception("Could not email ticket for registration %s", registration.registration_code)
        ticket.email_error = str(exc)[:300]
        ticket.save(update_fields=["email_error"])
