from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the platform's baseline staff roles and permissions."

    role_permissions = {
        "Event Manager": (
            "events.add_conference", "events.change_conference", "events.view_conference",
            "events.add_ticketcategory", "events.change_ticketcategory", "events.view_ticketcategory",
            "events.add_agendasession", "events.change_agendasession", "events.delete_agendasession",
            "registrations.view_registration",
        ),
        "Registration Staff": (
            "registrations.add_registration", "registrations.view_registration",
            "events.view_conference", "events.view_ticketcategory",
        ),
        "Check-in Staff": (
            "checkin.add_checkinrecord", "checkin.view_checkinrecord",
            "registrations.view_registration",
        ),
        "Finance Staff": (
            "payments.view_payment", "payments.change_payment", "payments.add_refund", "payments.view_refund",
            "payments.change_refund", "payments.view_settlement", "registrations.view_registration",
        ),
    }

    def handle(self, *args, **options):
        permissions = list(Permission.objects.select_related("content_type"))
        business_owner, _ = Group.objects.get_or_create(name="Business Owner")
        business_owner.permissions.set([p for p in permissions if p.content_type.app_label in ("core", "companies", "events", "registrations", "payments", "checkin", "reporting", "audit")])
        for role_name, codenames in self.role_permissions.items():
            group, _ = Group.objects.get_or_create(name=role_name)
            selected = [p for p in permissions if f"{p.content_type.app_label}.{p.codename}" in codenames]
            group.permissions.set(selected)
        self.stdout.write(self.style.SUCCESS("Baseline staff roles are ready. Assign users to Business Owner or an operational role."))
