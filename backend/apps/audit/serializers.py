
from rest_framework import serializers
from .models import AuditEntry


class AuditEntrySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditEntry
        fields = ("id", "actor_name", "action", "target_type", "target_id", "summary", "details", "ip_address", "created_at")

    def get_actor_name(self, entry):
        if entry.actor is None:
            return "System"
        return entry.actor.get_full_name() or entry.actor.get_username()
