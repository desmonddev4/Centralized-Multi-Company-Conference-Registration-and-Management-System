from rest_framework import serializers
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    conference_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ("id", "name", "slug", "logo_url", "contact_email", "contact_phone", "is_active", "conference_count", "created_at", "updated_at")
        read_only_fields = ("id", "slug", "conference_count", "created_at", "updated_at")

    def get_conference_count(self, company):
        return company.conference_count if hasattr(company, "conference_count") else company.conferences.count()
