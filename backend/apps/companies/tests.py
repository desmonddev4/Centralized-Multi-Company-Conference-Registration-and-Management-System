from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditEntry
from apps.companies.models import Company


class CompanyAdminWorkflowTests(APITestCase):
    def test_public_company_list_excludes_inactive_companies(self):
        Company.objects.create(name="Active Conference Group", is_active=True)
        Company.objects.create(name="Inactive Conference Group", is_active=False)

        response = self.client.get("/api/companies/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["name"] for row in response.data], ["Active Conference Group"])

    def test_owner_can_create_and_deactivate_company_with_audit_trail(self):
        owner = get_user_model().objects.create_superuser("company-owner", "owner@example.com", "test-pass")
        self.client.force_authenticate(owner)

        created = self.client.post("/api/companies/", {"name": "Northstar Events", "contact_email": "events@example.com"}, format="json")
        company = Company.objects.get(pk=created.data["id"])
        updated = self.client.patch(f"/api/companies/{company.pk}/", {"is_active": False}, format="json")

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertFalse(Company.objects.get(pk=company.pk).is_active)
        self.assertTrue(AuditEntry.objects.filter(action="company.created", target_id=str(company.pk)).exists())
        self.assertTrue(AuditEntry.objects.filter(action="company.deactivated", target_id=str(company.pk)).exists())

    def test_regular_authenticated_user_cannot_create_company(self):
        user = get_user_model().objects.create_user("company-staff", password="test-pass")
        self.client.force_authenticate(user)

        response = self.client.post("/api/companies/", {"name": "Restricted Company"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Company.objects.filter(name="Restricted Company").exists())
