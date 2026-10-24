from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditEntry
from apps.core.models import PlatformSettings


class PlatformSettingsAdminWorkflowTests(APITestCase):
    def test_public_settings_are_readable_but_not_publicly_editable(self):
        read_response = self.client.get("/api/settings/")
        patch_response = self.client.patch("/api/settings/", {"platform_name": "Changed"}, format="json")

        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotEqual(PlatformSettings.get_solo().platform_name, "Changed")

    def test_owner_can_update_settings_and_readiness(self):
        owner = get_user_model().objects.create_superuser("settings-owner", "owner@example.com", "test-pass")
        self.client.force_authenticate(owner)

        update = self.client.patch("/api/settings/", {
            "platform_name": "Conference Collective",
            "support_email": "help@example.com",
            "registration_hold_minutes": 20,
        }, format="json")
        readiness = self.client.get("/api/operations/readiness/")

        self.assertEqual(update.status_code, status.HTTP_200_OK, update.data)
        self.assertEqual(PlatformSettings.get_solo().platform_name, "Conference Collective")
        self.assertEqual(PlatformSettings.get_solo().registration_hold_minutes, 20)
        self.assertEqual(readiness.status_code, status.HTTP_200_OK)
        states = {item["key"]: item["status"] for item in readiness.data["checks"]}
        self.assertEqual(states["database"], "ok")
        self.assertEqual(states["migrations"], "ok")
        self.assertTrue(AuditEntry.objects.filter(action="platform.settings_updated").exists())

    def test_readiness_is_owner_only(self):
        user = get_user_model().objects.create_user("settings-staff", password="test-pass")
        self.client.force_authenticate(user)

        response = self.client.get("/api/operations/readiness/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
