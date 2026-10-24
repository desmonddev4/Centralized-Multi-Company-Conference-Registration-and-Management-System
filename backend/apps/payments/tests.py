from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.companies.models import Company
from apps.events.models import Conference, TicketCategory
from apps.payments.models import OfflineCollection, Payment, Refund, Settlement, SettlementTransaction
from apps.registrations.models import Registration


class OfflineRefundTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Refund test company")
        conference = Conference.objects.create(
            company=company,
            title="Refund Test Conference",
            starts_at=now + timedelta(days=10),
            ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        ticket = TicketCategory.objects.create(
            conference=conference,
            name="Standard",
            price_minor_units=10000,
            quantity_available=2,
        )
        self.registration = Registration.objects.create(
            ticket_category=ticket,
            full_name="Esi Boateng",
            email="esi@example.com",
            status=Registration.Status.CONFIRMED,
            amount_due_minor_units=10000,
            currency="GHS",
            payment_method=Registration.PaymentMethod.CASH,
            payment_received_at=now,
        )
        self.user = get_user_model().objects.create_superuser(
            username="refund-test-owner",
            email="owner@example.com",
            password="temporary-test-password-123",
        )
        self.client.force_authenticate(self.user)

    def submit_refund(self, amount):
        return self.client.post("/api/payments/refunds/", {
            "registration_code": self.registration.registration_code,
            "amount_minor_units": amount,
            "reason": "Attendee cancellation",
        }, format="json")

    def test_cash_refund_is_recorded_as_completed_with_staff_attribution(self):
        response = self.submit_refund(4000)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        refund = Refund.objects.get(public_id=response.data["public_id"])
        self.assertEqual(refund.method, Refund.Method.CASH)
        self.assertEqual(refund.status, Refund.Status.PROCESSED)
        self.assertEqual(refund.completed_by, self.user)
        self.assertIsNotNone(refund.processed_at)
        listed = self.client.get("/api/payments/refunds/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(listed.data[0]["registration_code"], self.registration.registration_code)

    def test_refunds_cannot_exceed_remaining_paid_amount(self):
        first = self.submit_refund(4000)
        second = self.submit_refund(6001)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Refund.objects.count(), 1)

    def test_anonymous_user_cannot_record_a_refund(self):
        self.client.force_authenticate(user=None)

        response = self.submit_refund(1000)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Refund.objects.count(), 0)


class PaymentReviewAdminWorkflowTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Payment review company")
        conference = Conference.objects.create(
            company=company, title="Payment Review Conference",
            starts_at=now + timedelta(days=10), ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED, capacity=5,
        )
        ticket = TicketCategory.objects.create(conference=conference, name="Standard", quantity_available=5, price_minor_units=5000)
        self.registration = Registration.objects.create(
            ticket_category=ticket, full_name="Kweku Antwi", email="kweku@example.com",
            status=Registration.Status.PAYMENT_REVIEW, amount_due_minor_units=5000,
            currency="GHS", payment_method=Registration.PaymentMethod.PAYSTACK,
            payment_received_at=now,
        )
        self.payment = Payment.objects.create(
            registration=self.registration, reference="CONF-REVIEW-123",
            status=Payment.Status.REVIEW, amount_minor_units=5000, currency="GHS",
            paystack_transaction_id=8451, paid_at=now,
        )
        self.owner = get_user_model().objects.create_superuser("review-owner", "owner@example.com", "test-pass")
        self.client.force_authenticate(self.owner)

    def test_payment_review_can_confirm_attendee_when_capacity_is_available(self):
        response = self.client.post(f"/api/payments/reviews/{self.registration.registration_code}/resolve/", {"action": "confirm"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.registration.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(self.registration.status, Registration.Status.CONFIRMED)
        self.assertEqual(self.payment.status, Payment.Status.SUCCEEDED)

    def test_payment_review_cancel_requires_a_reason_and_preserves_refund_follow_up(self):
        invalid = self.client.post(f"/api/payments/reviews/{self.registration.registration_code}/resolve/", {"action": "cancel", "reason": "No"}, format="json")
        response = self.client.post(f"/api/payments/reviews/{self.registration.registration_code}/resolve/", {"action": "cancel", "reason": "Capacity unavailable"}, format="json")

        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["status"], Registration.Status.CANCELLED)
        self.assertTrue(response.data["refund_required"])

    def test_review_queue_contains_verified_payment_review_registration(self):
        response = self.client.get("/api/payments/reviews/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["registration_code"], self.registration.registration_code)


class OnlinePaymentAdminWorkflowTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Online payment test company")
        conference = Conference.objects.create(
            company=company, title="Online Payment Test Conference",
            starts_at=now + timedelta(days=10), ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        ticket = TicketCategory.objects.create(conference=conference, name="Paid", quantity_available=5, price_minor_units=7500)
        self.registration = Registration.objects.create(
            ticket_category=ticket, full_name="Abena Frimpong", email="abena@example.com",
            status=Registration.Status.PENDING_PAYMENT, amount_due_minor_units=7500,
            currency="GHS", payment_method=Registration.PaymentMethod.PAYSTACK,
            hold_expires_at=now + timedelta(minutes=15),
        )

    @patch("apps.payments.services.paystack_request")
    def test_successful_paystack_verification_confirms_registration(self, request_paystack):
        request_paystack.return_value = {
            "authorization_url": "https://checkout.paystack.com/example",
            "access_code": "access-test",
        }
        initialized = self.client.post(f"/api/payments/initialize/{self.registration.registration_code}/", {}, format="json")
        self.assertEqual(initialized.status_code, status.HTTP_200_OK, initialized.data)
        payment = Payment.objects.get(reference=initialized.data["reference"])
        self.assertEqual(payment.status, Payment.Status.INITIALIZED)

        request_paystack.return_value = {
            "status": "success", "reference": payment.reference, "amount": 7500,
            "currency": "GHS", "id": 998877, "gateway_response": "Approved",
        }
        verified = self.client.get(f"/api/payments/verify/{payment.reference}/")

        self.assertEqual(verified.status_code, status.HTTP_200_OK, verified.data)
        self.registration.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCEEDED)
        self.assertEqual(payment.paystack_transaction_id, 998877)
        self.assertEqual(self.registration.status, Registration.Status.CONFIRMED)
        self.assertEqual(self.registration.payment_method, Registration.PaymentMethod.PAYSTACK)


class SettlementAdminWorkflowTests(APITestCase):
    def test_settlement_transactions_expose_the_linked_registration_code(self):
        now = timezone.now()
        company = Company.objects.create(name="Settlement test company")
        conference = Conference.objects.create(
            company=company, title="Settlement Test Conference",
            starts_at=now + timedelta(days=10), ends_at=now + timedelta(days=11),
        )
        ticket = TicketCategory.objects.create(conference=conference, name="Paid", quantity_available=5)
        registration = Registration.objects.create(
            ticket_category=ticket, full_name="Yaa Ofori", email="yaa@example.com",
            status=Registration.Status.CONFIRMED, amount_due_minor_units=3000,
            currency="GHS", payment_method=Registration.PaymentMethod.PAYSTACK,
            payment_received_at=now,
        )
        payment = Payment.objects.create(
            registration=registration, reference="CONF-SETTLEMENT-1",
            status=Payment.Status.SUCCEEDED, amount_minor_units=3000, currency="GHS",
        )
        settlement = Settlement.objects.create(paystack_id=4501, status="success", currency="GHS", total_amount_minor_units=3000)
        SettlementTransaction.objects.create(
            settlement=settlement, paystack_id=8512, reference=payment.reference,
            status="success", amount_minor_units=3000, currency="GHS", payment=payment,
        )
        owner = get_user_model().objects.create_superuser("settlement-owner", "owner@example.com", "test-pass")
        self.client.force_authenticate(owner)

        with patch("apps.payments.views.sync_settlement_transactions", return_value={"total": 1, "perPage": 100, "page": 1}):
            response = self.client.get(f"/api/payments/settlements/{settlement.paystack_id}/transactions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["results"][0]["registration_code"], registration.registration_code)


class PaymentAndCollectionAdminWorkflowTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Finance list company")
        conference = Conference.objects.create(
            company=company, title="Finance List Conference",
            starts_at=now + timedelta(days=10), ends_at=now + timedelta(days=11),
        )
        ticket = TicketCategory.objects.create(conference=conference, name="Paid", quantity_available=5, price_minor_units=3000)
        self.registration = Registration.objects.create(
            ticket_category=ticket, full_name="Adwoa Asare", email="adwoa@example.com",
            status=Registration.Status.CONFIRMED, amount_due_minor_units=3000,
            currency="GHS", payment_method=Registration.PaymentMethod.MOMO,
            payment_received_at=now,
        )
        self.collection = OfflineCollection.objects.create(
            registration=self.registration, method=OfflineCollection.Method.MOMO,
            amount_minor_units=3000, currency="GHS", receipt_reference="MOMO-LIST-1",
            received_at=now,
        )
        self.payment = Payment.objects.create(
            registration=self.registration, reference="CONF-LIST-1",
            status=Payment.Status.SUCCEEDED, amount_minor_units=3000, currency="GHS",
        )
        self.owner = get_user_model().objects.create_superuser("finance-list-owner", "owner@example.com", "test-pass")

    def test_finance_pages_list_payment_and_filter_offline_collections(self):
        self.client.force_authenticate(self.owner)

        payments = self.client.get("/api/payments/")
        momo = self.client.get("/api/payments/offline-collections/?method=momo")
        cash = self.client.get("/api/payments/offline-collections/?method=cash")

        self.assertEqual(payments.status_code, status.HTTP_200_OK)
        self.assertEqual(len(payments.data), 1)
        self.assertEqual(payments.data[0]["reference"], self.payment.reference)
        self.assertEqual(momo.status_code, status.HTTP_200_OK)
        self.assertEqual(len(momo.data), 1)
        self.assertEqual(momo.data[0]["receipt_reference"], "MOMO-LIST-1")
        self.assertEqual(cash.data, [])

    def test_finance_ledgers_are_restricted_from_regular_staff(self):
        user = get_user_model().objects.create_user("finance-no-access", password="test-pass")
        self.client.force_authenticate(user)

        payments = self.client.get("/api/payments/")
        collections = self.client.get("/api/payments/offline-collections/")

        self.assertEqual(payments.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(collections.status_code, status.HTTP_403_FORBIDDEN)
