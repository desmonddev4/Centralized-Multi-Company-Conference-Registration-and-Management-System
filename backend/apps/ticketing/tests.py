from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.companies.models import Company
from apps.events.models import Conference, TicketCategory
from apps.registrations.models import Registration
from apps.ticketing.models import IssuedTicket


class TicketDeliveryAdminWorkflowTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Ticket test company")
        conference = Conference.objects.create(
            company=company, title="Ticket Test Conference",
            starts_at=now + timedelta(days=10), ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        ticket = TicketCategory.objects.create(conference=conference, name="Standard", quantity_available=5)
        self.registration = Registration.objects.create(
            ticket_category=ticket, full_name="Mansa Asante", email="mansa@example.com",
            status=Registration.Status.CONFIRMED, amount_due_minor_units=0, currency="GHS",
        )
        self.owner = get_user_model().objects.create_superuser("tickets-owner", "owner@example.com", "test-pass")
        self.client.force_authenticate(self.owner)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_admin_resend_issues_ticket_and_sends_email(self):
        response = self.client.post(f"/api/tickets/delivery/{self.registration.registration_code}/resend/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        ticket = IssuedTicket.objects.get(registration=self.registration)
        self.assertIsNotNone(ticket.email_sent_at)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.registration.registration_code, mail.outbox[0].body)

    def test_admin_delivery_queue_only_lists_confirmed_registrations(self):
        Registration.objects.create(
            ticket_category=self.registration.ticket_category,
            full_name="Pending Attendee", email="pending@example.com",
            status=Registration.Status.PENDING_PAYMENT, amount_due_minor_units=2500,
            currency="GHS", hold_expires_at=timezone.now() + timedelta(minutes=10),
        )

        response = self.client.get("/api/tickets/delivery/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["registration_code"], self.registration.registration_code)
