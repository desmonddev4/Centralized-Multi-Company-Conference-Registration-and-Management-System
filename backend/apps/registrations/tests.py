from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.companies.models import Company
from apps.events.models import Conference, TicketCategory
from apps.payments.models import OfflineCollection
from apps.registrations.models import Registration


class PublicRegistrationTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        self.company = Company.objects.create(name="Registration test company")
        self.conference = Conference.objects.create(
            company=self.company,
            title="Registration Test Conference",
            starts_at=now + timedelta(days=10),
            ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        self.ticket = TicketCategory.objects.create(
            conference=self.conference,
            name="Standard",
            price_minor_units=0,
            quantity_available=2,
        )
        self.url = f"/api/events/{self.conference.slug}/registrations/"

    def payload(self, **overrides):
        data = {
            "ticket_category": self.ticket.pk,
            "full_name": "  Ama   Mensah  ",
            "email": "AMA@example.com",
        }
        data.update(overrides)
        return data

    def test_free_registration_confirms_and_assigns_unique_code(self):
        first = self.client.post(self.url, self.payload(), format="json")
        second = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["status"], Registration.Status.CONFIRMED)
        self.assertEqual(first.data["full_name"], "Ama Mensah")
        self.assertNotEqual(first.data["registration_code"], second.data["registration_code"])

    def test_paid_registration_stays_pending_with_a_time_limited_hold(self):
        self.ticket.price_minor_units = 2500
        self.ticket.save(update_fields=["price_minor_units"])

        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Registration.Status.PENDING_PAYMENT)
        self.assertEqual(response.data["amount_due_minor_units"], 2500)
        self.assertIsNotNone(response.data["hold_expires_at"])

    def test_sold_out_ticket_rejects_an_additional_registration(self):
        self.ticket.quantity_available = 1
        self.ticket.save(update_fields=["quantity_available"])
        self.client.post(self.url, self.payload(), format="json")

        response = self.client.post(self.url, self.payload(email="second@example.com"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Registration.objects.count(), 1)

    def test_full_name_requires_at_least_two_words(self):
        response = self.client.post(self.url, self.payload(full_name="Ama"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Registration.objects.count(), 0)


class WalkInRegistrationTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Walk-in test company")
        self.conference = Conference.objects.create(
            company=company,
            title="Walk-in Test Conference",
            starts_at=now + timedelta(days=10),
            ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        self.ticket = TicketCategory.objects.create(
            conference=self.conference,
            name="Standard",
            price_minor_units=2500,
            currency="GHS",
            quantity_available=2,
        )
        self.user = get_user_model().objects.create_superuser(
            username="walkin-test-owner",
            email="owner@example.com",
            password="temporary-test-password-123",
        )

    def payload(self, **overrides):
        data = {
            "conference": self.conference.slug,
            "ticket_category": self.ticket.pk,
            "full_name": "Kojo Appiah",
            "email": "kojo@example.com",
            "payment_method": "momo",
            "payment_reference": "MOMO-TEST-123",
        }
        data.update(overrides)
        return data

    def test_momo_walk_in_records_payment_and_receiver(self):
        self.client.force_authenticate(self.user)

        response = self.client.post("/api/walk-ins/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registration = Registration.objects.get(registration_code=response.data["registration_code"])
        collection = OfflineCollection.objects.get(registration=registration)
        self.assertEqual(registration.status, Registration.Status.CONFIRMED)
        self.assertEqual(registration.payment_method, Registration.PaymentMethod.MOMO)
        self.assertEqual(collection.amount_minor_units, 2500)
        self.assertEqual(collection.receipt_reference, "MOMO-TEST-123")
        self.assertEqual(collection.received_by, self.user)

    def test_free_walk_in_does_not_create_a_payment_collection(self):
        self.ticket.price_minor_units = 0
        self.ticket.save(update_fields=["price_minor_units"])
        self.client.force_authenticate(self.user)

        response = self.client.post("/api/walk-ins/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registration = Registration.objects.get(registration_code=response.data["registration_code"])
        self.assertEqual(registration.payment_method, Registration.PaymentMethod.NONE)
        self.assertFalse(OfflineCollection.objects.filter(registration=registration).exists())

    def test_walk_in_requires_staff_authorization(self):
        response = self.client.post("/api/walk-ins/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Registration.objects.count(), 0)


class AdminRegistrationListTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Attendee admin company")
        conference = Conference.objects.create(
            company=company, title="Attendee Admin Conference",
            starts_at=now + timedelta(days=10), ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        ticket = TicketCategory.objects.create(conference=conference, name="Standard", quantity_available=5)
        self.confirmed = Registration.objects.create(
            ticket_category=ticket, full_name="Nana Owusu", email="nana@example.com",
            status=Registration.Status.CONFIRMED, amount_due_minor_units=0,
        )
        Registration.objects.create(
            ticket_category=ticket, full_name="Pending Owusu", email="pending@example.com",
            status=Registration.Status.PENDING_PAYMENT, amount_due_minor_units=2500,
            hold_expires_at=now + timedelta(minutes=10),
        )
        self.owner = get_user_model().objects.create_superuser("attendee-admin", "owner@example.com", "test-pass")

    def test_admin_attendee_list_can_filter_status_and_contains_contact_details(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get("/api/registrations/?status=confirmed")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["registration_code"], self.confirmed.registration_code)
        self.assertEqual(response.data[0]["email"], "nana@example.com")

    def test_attendee_contact_list_is_not_public(self):
        response = self.client.get("/api/registrations/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
