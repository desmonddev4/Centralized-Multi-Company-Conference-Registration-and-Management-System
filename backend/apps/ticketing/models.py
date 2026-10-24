import uuid

from django.db import models


class IssuedTicket(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    registration = models.OneToOneField("registrations.Registration", on_delete=models.PROTECT, related_name="issued_ticket")
    issued_at = models.DateTimeField(auto_now_add=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_error = models.CharField(max_length=300, blank=True)

    def __str__(self):
        return f"Ticket for {self.registration.registration_code}"
