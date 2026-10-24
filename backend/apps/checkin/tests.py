from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditEntry
from apps.companies.models import Company
from apps.events.models import Conference, TicketCategory
from apps.registrations.models import Registration
from apps.checkin.models import CheckInRecord


class CheckInWorkflowTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Check-in test company")
        conference = Conference.objects.create(
            company=company,
            title="Check-in Test Conference",
            starts_at=now + timedelta(days=10),
            ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        ticket = TicketCategory.objects.create(
            conference=conference,
            name="Standard",
            price_minor_units=0,
            quantity_available=2,
        )
        self.registration = Registration.objects.create(
            ticket_category=ticket,
            full_name="Kofi Owusu",
            email="kofi@example.com",
            status=Registration.Status.CONFIRMED,
            amount_due_minor_units=0,
            currency="GHS",
        )
        self.user = get_user_model().objects.create_superuser(
            username="checkin-test-owner",
            email="owner@example.com",
            password="temporary-test-password-123",
        )
        self.url = f"/api/check-ins/{self.registration.registration_code}/"

    def test_check_in_records_once_and_repeat_is_idempotent(self):
        self.client.force_authenticate(self.user)

        first = self.client.post(self.url, {}, format="json")
        repeated = self.client.post(self.url, {}, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(CheckInRecord.objects.count(), 1)
        self.assertEqual(AuditEntry.objects.filter(action="check_in.recorded").count(), 1)

    def test_anonymous_staff_action_is_rejected(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(CheckInRecord.objects.count(), 0)

    def test_pending_payment_registration_cannot_be_checked_in(self):
        self.registration.status = Registration.Status.PENDING_PAYMENT
        self.registration.save(update_fields=["status"])
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CheckInRecord.objects.count(), 0)

    def test_admin_checkin_log_lists_recorded_entry(self):
        self.client.force_authenticate(self.user)
        self.client.post(self.url, {}, format="json")

        response = self.client.get(f"/api/check-ins/?conference={self.registration.conference.slug}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["registration_code"], self.registration.registration_code)
        self.assertEqual(response.data[0]["attendee_name"], "Kofi Owusu")
