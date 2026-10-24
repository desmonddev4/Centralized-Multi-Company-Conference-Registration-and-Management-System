from rest_framework import serializers
from .models import IssuedTicket


class IssuedTicketSerializer(serializers.Serializer):
    registration_code = serializers.CharField(source="registration.registration_code")
    attendee_name = serializers.CharField(source="registration.full_name")
    ticket_name = serializers.CharField(source="registration.ticket_category.name")
    conference_title = serializers.CharField(source="registration.ticket_category.conference.title")
    venue_name = serializers.CharField(source="registration.ticket_category.conference.venue_name")
    venue_address = serializers.CharField(source="registration.ticket_category.conference.venue_address")
    starts_at = serializers.DateTimeField(source="registration.ticket_category.conference.starts_at")
    ends_at = serializers.DateTimeField(source="registration.ticket_category.conference.ends_at")
    issued_at = serializers.DateTimeField()


class TicketDeliverySerializer(serializers.ModelSerializer):
    registration_code = serializers.CharField(source="registration.registration_code", read_only=True)
    attendee_name = serializers.CharField(source="registration.full_name", read_only=True)
    email = serializers.EmailField(source="registration.email", read_only=True)
    conference_title = serializers.CharField(source="registration.ticket_category.conference.title", read_only=True)
    company_name = serializers.CharField(source="registration.ticket_category.conference.company.name", read_only=True)
    ticket_name = serializers.CharField(source="registration.ticket_category.name", read_only=True)
    registration_status = serializers.CharField(source="registration.status", read_only=True)

    class Meta:
        model = IssuedTicket
        fields = ("registration_code", "attendee_name", "email", "conference_title", "company_name", "ticket_name", "registration_status", "issued_at", "email_sent_at", "email_error")


class TicketDeliveryQueueSerializer(serializers.Serializer):
    registration_code = serializers.CharField()
    attendee_name = serializers.CharField(source="full_name")
    email = serializers.EmailField()
    conference_title = serializers.CharField(source="ticket_category.conference.title")
    company_name = serializers.CharField(source="ticket_category.conference.company.name")
    ticket_name = serializers.CharField(source="ticket_category.name")
    registration_status = serializers.CharField(source="status")
    ticket_issued = serializers.SerializerMethodField()
    issued_at = serializers.SerializerMethodField()
    email_sent_at = serializers.SerializerMethodField()
    email_error = serializers.SerializerMethodField()

    def get_ticket_issued(self, obj):
        return hasattr(obj, "issued_ticket")

    def get_issued_at(self, obj):
        ticket = getattr(obj, "issued_ticket", None)
        return ticket.issued_at if ticket else None

    def get_email_sent_at(self, obj):
        ticket = getattr(obj, "issued_ticket", None)
        return ticket.email_sent_at if ticket else None

    def get_email_error(self, obj):
        ticket = getattr(obj, "issued_ticket", None)
        return ticket.email_error if ticket else ""
