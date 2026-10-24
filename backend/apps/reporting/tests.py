from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.companies.models import Company
from apps.events.models import Conference, TicketCategory
from apps.registrations.models import Registration


class AdminReportingWorkflowTests(APITestCase):
    def setUp(self):
        now = timezone.now()
        company = Company.objects.create(name="Reporting test company")
        conference = Conference.objects.create(
            company=company, title="Reporting Test Conference",
            starts_at=now + timedelta(days=10), ends_at=now + timedelta(days=11),
            status=Conference.Status.PUBLISHED,
        )
        ticket = TicketCategory.objects.create(conference=conference, name="Paid", quantity_available=5, price_minor_units=12500)
        self.registration = Registration.objects.create(
            ticket_category=ticket, full_name="Afi Kwarteng", email="afi@example.com",
            status=Registration.Status.CONFIRMED, amount_due_minor_units=12500,
            currency="GHS", payment_method=Registration.PaymentMethod.CASH,
            payment_received_at=now,
        )
        owner = get_user_model().objects.create_superuser("reports-owner", "owner@example.com", "test-pass")
        self.client.force_authenticate(owner)

    def test_owner_report_includes_revenue_and_registration_totals(self):
        response = self.client.get("/api/reporting/dashboard/?period=all")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["financial_access"])
        self.assertEqual(response.data["summary"]["registration_count"], 1)
        self.assertEqual(response.data["summary"]["gross_revenue"], [{"currency": "GHS", "amount_minor_units": 12500}])

    def test_registration_role_report_omits_financial_data(self):
        user = get_user_model().objects.create_user("reporting-staff", password="test-pass")
        permission = Permission.objects.get(content_type__app_label="registrations", codename="view_registration")
        user.user_permissions.add(permission)
        self.client.force_authenticate(user)

        response = self.client.get("/api/reporting/dashboard/?period=all")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["financial_access"])
        self.assertIsNone(response.data["summary"]["paid_registration_count"])
        self.assertEqual(response.data["summary"]["gross_revenue"], [])

    def test_invalid_report_period_is_rejected(self):
        response = self.client.get("/api/reporting/dashboard/?period=7d")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
