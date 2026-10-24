
from django.conf import settings
from django.db import models
from apps.registrations.models import Registration


class CheckInRecord(models.Model):
    registration = models.OneToOneField(Registration, on_delete=models.PROTECT, related_name="check_in")
    checked_in_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="check_ins")
    checked_in_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-checked_in_at"]

    def __str__(self):
        return f"{self.registration.registration_code} checked in"
