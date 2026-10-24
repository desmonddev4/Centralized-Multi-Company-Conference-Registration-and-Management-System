from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.services import record_audit


class AuditLogAdminWorkflowTests(APITestCase):
    def test_owner_can_search_audit_entries(self):
        owner = get_user_model().objects.create_superuser("audit-owner", "owner@example.com", "test-pass")
        record_audit(action="company.created", summary="Northstar company created", actor=owner, target_type="company", target_id="42")
        self.client.force_authenticate(owner)

        response = self.client.get("/api/audit/?search=Northstar&target=company")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["target_id"], "42")

    def test_audit_log_is_restricted_to_business_owners(self):
        user = get_user_model().objects.create_user("audit-staff", password="test-pass")
        self.client.force_authenticate(user)

        response = self.client.get("/api/audit/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
