from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditEntry


class StaffAndRoleAdminWorkflowTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_superuser("accounts-owner", "owner@example.com", "test-pass")
        self.client.force_authenticate(self.owner)

    def test_owner_creates_role_and_assigns_it_to_staff_account(self):
        permission = Permission.objects.get(content_type__app_label="checkin", codename="add_checkinrecord")
        role_response = self.client.post("/api/auth/roles/", {"name": "Door Supervisor", "permissions": [permission.pk]}, format="json")
        role = Group.objects.get(name="Door Supervisor")
        user_response = self.client.post("/api/auth/users/", {
            "username": "door-supervisor",
            "email": "door@example.com",
            "full_name": "Door Supervisor",
            "password": "V7@pK!nW4#xQ9rT2",
            "groups": [role.pk],
        }, format="json")

        self.assertEqual(role_response.status_code, status.HTTP_201_CREATED, role_response.data)
        self.assertEqual(user_response.status_code, status.HTTP_201_CREATED, user_response.data)
        staff = get_user_model().objects.get(username="door-supervisor")
        self.assertTrue(staff.is_staff)
        self.assertIn("checkin.add_checkinrecord", staff.get_all_permissions())
        self.assertTrue(AuditEntry.objects.filter(action="role.created").exists())
        self.assertTrue(AuditEntry.objects.filter(action="user.created").exists())

    def test_business_owner_role_cannot_be_edited_or_deleted(self):
        owner_role = Group.objects.create(name="Business Owner")

        edit_response = self.client.patch(f"/api/auth/roles/{owner_role.pk}/", {"name": "Changed Owner"}, format="json")
        delete_response = self.client.delete(f"/api/auth/roles/{owner_role.pk}/")

        self.assertEqual(edit_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Group.objects.filter(pk=owner_role.pk, name="Business Owner").exists())

    def test_non_owner_cannot_manage_staff_accounts(self):
        self.client.force_authenticate(get_user_model().objects.create_user("regular-staff", password="test-pass"))

        response = self.client.get("/api/auth/users/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
