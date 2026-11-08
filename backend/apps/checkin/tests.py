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
from apps.payments.models import OfflineCollection, Payment


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


class KioskAttendanceTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Kiosk test company")
        self.conference = Conference.objects.create(
            company=company,
            title="Kiosk Test Conference",
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=1),
            status=Conference.Status.PUBLISHED,
        )
        self.ticket = TicketCategory.objects.create(
            conference=self.conference,
            name="Standard",
            price_minor_units=2500,
            quantity_available=10,
        )
        self.registration = Registration.objects.create(
            ticket_category=self.ticket,
            full_name="Nana Owusu",
            email="nana@example.com",
            phone="+233 20-123-4567",
            status=Registration.Status.CONFIRMED,
            amount_due_minor_units=2500,
            currency="GHS",
            payment_method=Registration.PaymentMethod.CASH,
            payment_received_at=now,
        )
        self.url = "/api/check-ins/attend/"
        self.payload = {
            "conference": self.conference.slug,
            "full_name": "  Nana   Owusu ",
            "phone": "+233 (20) 123 4567",
            "job_title": "Product Manager",
            "organization": "Example Company",
            "role": "attendee",
        }
        OfflineCollection.objects.create(
            registration=self.registration,
            method=OfflineCollection.Method.CASH,
            amount_minor_units=2500,
            currency="GHS",
            received_at=now,
        )

    def test_kiosk_verifies_cash_payment_records_attendance_and_saves_profile(self):
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["attendee"]["full_name"], "Nana Owusu")
        self.assertEqual(response.data["attendee"]["organization"], "Example Company")
        self.assertEqual(response.data["attendee"]["role"], "attendee")
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.job_title, "Product Manager")
        self.assertEqual(self.registration.attendee_role, "attendee")
        checkin = CheckInRecord.objects.get(registration=self.registration)
        self.assertIsNone(checkin.checked_in_by)
        user = get_user_model().objects.create_superuser("kiosk-log-admin", "admin@example.com", "test-pass")
        self.client.force_authenticate(user)
        self.assertEqual(
            self.client.get(f"/api/check-ins/?conference={self.conference.slug}").data[0]["checked_in_by_name"],
            "Attendee kiosk",
        )

    def test_kiosk_rejects_cash_registration_without_matching_collection(self):
        OfflineCollection.objects.filter(registration=self.registration).delete()

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CheckInRecord.objects.count(), 0)

    def test_kiosk_rejects_a_cash_collection_with_the_wrong_amount(self):
        collection = OfflineCollection.objects.get(registration=self.registration)
        collection.amount_minor_units = 2499
        collection.save(update_fields=["amount_minor_units"])

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CheckInRecord.objects.count(), 0)

    def test_kiosk_verifies_successful_online_payment(self):
        OfflineCollection.objects.filter(registration=self.registration).delete()
        self.registration.payment_method = Registration.PaymentMethod.PAYSTACK
        self.registration.save(update_fields=["payment_method"])
        Payment.objects.create(
            registration=self.registration,
            reference="kiosk-successful-payment",
            status=Payment.Status.SUCCEEDED,
            amount_minor_units=2500,
            currency="GHS",
        )

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CheckInRecord.objects.count(), 1)

    def test_kiosk_rejects_a_registration_without_a_recorded_payment(self):
        self.registration.payment_received_at = None
        self.registration.save(update_fields=["payment_received_at"])

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CheckInRecord.objects.count(), 0)

    def test_kiosk_rejects_ambiguous_matching_registrations(self):
        Registration.objects.create(
            ticket_category=self.ticket,
            full_name="Nana Owusu",
            email="another-nana@example.com",
            phone="+233 20 123 4567",
            status=Registration.Status.CONFIRMED,
            amount_due_minor_units=0,
        )

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CheckInRecord.objects.count(), 0)

    def test_kiosk_checkin_is_idempotent(self):
        first = self.client.post(self.url, self.payload, format="json")
        second = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data["already_checked_in"])
        self.assertEqual(CheckInRecord.objects.count(), 1)

    def test_kiosk_rejects_invalid_name_and_phone(self):
        invalid_name = self.client.post(self.url, {**self.payload, "full_name": "Nana"}, format="json")
        invalid_phone = self.client.post(self.url, {**self.payload, "phone": "not a phone"}, format="json")

        self.assertEqual(invalid_name.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_phone.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CheckInRecord.objects.count(), 0)

    def test_kiosk_only_opens_during_published_conference(self):
        self.conference.starts_at = timezone.now() + timedelta(days=1)
        self.conference.save(update_fields=["starts_at"])

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CheckInRecord.objects.count(), 0)
