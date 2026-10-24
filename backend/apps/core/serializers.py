from rest_framework import serializers
from .models import PlatformSettings


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = ("platform_name", "support_email", "support_phone", "registration_hold_minutes", "updated_at")
        read_only_fields = ("updated_at",)
