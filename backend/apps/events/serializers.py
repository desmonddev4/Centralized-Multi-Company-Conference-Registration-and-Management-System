from django.db import transaction
from rest_framework import serializers
from .models import AgendaSession, Conference, TicketCategory


class AgendaSessionSerializer(serializers.ModelSerializer):
    conference_slug = serializers.CharField(source="conference.slug", read_only=True)

    class Meta:
        model = AgendaSession
        fields = ("id", "conference", "conference_slug", "title", "description", "speaker_name", "starts_at", "ends_at", "venue_name", "sort_order", "created_at", "updated_at")
        read_only_fields = ("id", "conference_slug", "created_at", "updated_at")

    def validate(self, attrs):
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({"ends_at": "The session end must follow its start."})
        conference = attrs.get("conference", getattr(self.instance, "conference", None))
        if conference and starts and ends and (starts < conference.starts_at or ends > conference.ends_at):
            raise serializers.ValidationError("Sessions must fit within the conference schedule.")
        return attrs


class TicketCategorySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    quantity_available = serializers.IntegerField(min_value=1)
    max_per_registration = serializers.IntegerField(min_value=1)
    remaining_quantity = serializers.IntegerField(read_only=True)
    current_price_minor_units = serializers.SerializerMethodField()

    class Meta:
        model = TicketCategory
        fields = (
            "id", "conference", "name", "description", "price_minor_units", "early_price_minor_units",
            "early_sales_close_at", "current_price_minor_units", "currency",
            "quantity_available", "max_per_registration", "sales_open_at", "sales_close_at",
            "is_active", "sort_order", "remaining_quantity", "created_at", "updated_at",
        )
        read_only_fields = ("conference", "created_at", "updated_at", "remaining_quantity")

    def validate(self, attrs):
        early_price = attrs.get("early_price_minor_units", getattr(self.instance, "early_price_minor_units", None))
        early_close = attrs.get("early_sales_close_at", getattr(self.instance, "early_sales_close_at", None))
        if (early_price is None) != (early_close is None):
            raise serializers.ValidationError("Set both the early fee and its closing time, or leave both empty.")
        opens = attrs.get("sales_open_at", getattr(self.instance, "sales_open_at", None))
        closes = attrs.get("sales_close_at", getattr(self.instance, "sales_close_at", None))
        if opens and closes and closes <= opens:
            raise serializers.ValidationError({"sales_close_at": "Sales must close after they open."})
        return attrs

    def get_current_price_minor_units(self, category):
        return category.price_at()

    def create(self, validated_data):
        validated_data.pop("id", None)
        return super().create(validated_data)


class ConferenceSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    capacity = serializers.IntegerField(min_value=1, allow_null=True, required=False)
    ticket_categories = TicketCategorySerializer(many=True, required=False)
    agenda_sessions = AgendaSessionSerializer(many=True, read_only=True)

    class Meta:
        model = Conference
        fields = (
            "id", "public_id", "slug", "company", "company_name", "title", "description",
            "banner_url", "registration_url", "venue_name", "venue_address", "starts_at", "ends_at",
            "registration_opens_at", "registration_closes_at", "capacity", "status",
            "ticket_categories", "agenda_sessions", "created_at", "updated_at",
        )
        read_only_fields = ("id", "public_id", "slug", "company_name", "created_at", "updated_at")

    def validate(self, attrs):
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        opens = attrs.get("registration_opens_at", getattr(self.instance, "registration_opens_at", None))
        closes = attrs.get("registration_closes_at", getattr(self.instance, "registration_closes_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({"ends_at": "The end date and time must follow the start."})
        if opens and closes and closes <= opens:
            raise serializers.ValidationError({"registration_closes_at": "Registration must close after it opens."})
        capacity = attrs.get("capacity", getattr(self.instance, "capacity", None))
        categories = attrs.get("ticket_categories")
        if categories is not None:
            total_tickets = sum(item.get("quantity_available", 0) for item in categories)
        elif self.instance:
            total_tickets = sum(self.instance.ticket_categories.values_list("quantity_available", flat=True))
        else:
            total_tickets = 0
        if capacity is not None and total_tickets > capacity:
            raise serializers.ValidationError({"capacity": "Conference capacity must cover the total ticket quantity."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        categories = validated_data.pop("ticket_categories", [])
        conference = Conference.objects.create(**validated_data)
        for category in categories:
            category.pop("id", None)
            TicketCategory.objects.create(conference=conference, **category)
        return conference

    @transaction.atomic
    def update(self, instance, validated_data):
        categories = validated_data.pop("ticket_categories", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if categories is not None:
            seen_ids = set()
            for category_data in categories:
                category_id = category_data.pop("id", None)
                if category_id is None:
                    TicketCategory.objects.create(conference=instance, **category_data)
                    continue
                if category_id in seen_ids:
                    raise serializers.ValidationError({"ticket_categories": "A ticket category was included more than once."})
                seen_ids.add(category_id)
                try:
                    category = instance.ticket_categories.get(pk=category_id)
                except TicketCategory.DoesNotExist:
                    raise serializers.ValidationError({"ticket_categories": "A ticket category does not belong to this conference."})
                for field, value in category_data.items():
                    setattr(category, field, value)
                category.save()
        return instance
