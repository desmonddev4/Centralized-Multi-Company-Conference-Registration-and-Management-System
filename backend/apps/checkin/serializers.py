
from rest_framework import serializers
from apps.registrations.serializers import RegistrationLookupSerializer
from .models import CheckInRecord


class CheckInRecordSerializer(serializers.ModelSerializer):
    registration = RegistrationLookupSerializer(read_only=True)
    checked_in_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CheckInRecord
        fields = ("registration", "checked_in_at", "checked_in_by_name")

    def get_checked_in_by_name(self, obj):
        if obj.checked_in_by is None:
            return "Attendee kiosk"
        return obj.checked_in_by.get_full_name() or obj.checked_in_by.get_username()


class CheckInLogSerializer(serializers.ModelSerializer):
    registration_code = serializers.CharField(source="registration.registration_code", read_only=True)
    attendee_name = serializers.CharField(source="registration.full_name", read_only=True)
    conference_title = serializers.CharField(source="registration.ticket_category.conference.title", read_only=True)
    conference_slug = serializers.CharField(source="registration.ticket_category.conference.slug", read_only=True)
    company_name = serializers.CharField(source="registration.ticket_category.conference.company.name", read_only=True)
    ticket_name = serializers.CharField(source="registration.ticket_category.name", read_only=True)
    checked_in_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CheckInRecord
        fields = ("registration_code", "attendee_name", "conference_title", "conference_slug", "company_name", "ticket_name", "checked_in_at", "checked_in_by_name")

    def get_checked_in_by_name(self, obj):
        if obj.checked_in_by is None:
            return "Attendee kiosk"
        return obj.checked_in_by.get_full_name() or obj.checked_in_by.get_username()
