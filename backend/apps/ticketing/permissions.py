
from rest_framework.permissions import BasePermission

from apps.registrations.models import Registration


class ConfirmedTicketPermission(BasePermission):
    """Allow public ticket access only after registration has been confirmed."""

    message = "A ticket is available after the registration is confirmed."

    def has_object_permission(self, request, view, registration):
        return registration.status == Registration.Status.CONFIRMED
