from rest_framework import serializers
from .models import OfflineCollection, Payment, Refund, Settlement, SettlementTransaction


class OfflineCollectionSerializer(serializers.ModelSerializer):
    registration_code = serializers.CharField(source="registration.registration_code", read_only=True)
    attendee_name = serializers.CharField(source="registration.full_name", read_only=True)
    conference_slug = serializers.CharField(source="registration.ticket_category.conference.slug", read_only=True)
    conference_title = serializers.CharField(source="registration.ticket_category.conference.title", read_only=True)
    company_name = serializers.CharField(source="registration.ticket_category.conference.company.name", read_only=True)
    ticket_name = serializers.CharField(source="registration.ticket_category.name", read_only=True)
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OfflineCollection
        fields = ("id", "registration_code", "attendee_name", "conference_slug", "conference_title", "company_name", "ticket_name", "method", "amount_minor_units", "currency", "receipt_reference", "received_by_name", "received_at")

    def get_received_by_name(self, obj):
        return (obj.received_by.get_full_name() or obj.received_by.get_username()) if obj.received_by else "Historical record"


class PaymentPublicSerializer(serializers.ModelSerializer):
    registration_code = serializers.CharField(source="registration.registration_code", read_only=True)

    class Meta:
        model = Payment
        fields = ("reference", "status", "amount_minor_units", "currency", "authorization_url", "registration_code", "created_at")


class PaymentReviewSerializer(serializers.Serializer):
    registration_code = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    conference_title = serializers.CharField(source="ticket_category.conference.title")
    company_name = serializers.CharField(source="ticket_category.conference.company.name")
    ticket_category_name = serializers.CharField(source="ticket_category.name")
    amount_due_minor_units = serializers.IntegerField()
    currency = serializers.CharField()
    payment_received_at = serializers.DateTimeField()
    payment_reference = serializers.SerializerMethodField()
    paystack_transaction_id = serializers.SerializerMethodField()

    def _review_payment(self, registration):
        payments = getattr(registration, "review_payments", None)
        return payments[0] if payments else None

    def get_payment_reference(self, registration):
        payment = self._review_payment(registration)
        return payment.reference if payment else ""

    def get_paystack_transaction_id(self, registration):
        payment = self._review_payment(registration)
        return payment.paystack_transaction_id if payment else None


class PaymentReviewResolveSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("confirm", "cancel"))
    reason = serializers.CharField(max_length=300, allow_blank=True, required=False, default="")

    def validate(self, attrs):
        if attrs["action"] == "cancel" and len(attrs["reason"].strip()) < 5:
            raise serializers.ValidationError({"reason": "Give a reason of at least 5 characters when cancelling this registration."})
        attrs["reason"] = attrs["reason"].strip()
        return attrs


class RefundSerializer(serializers.ModelSerializer):
    registration_code = serializers.CharField(source="registration.registration_code", read_only=True)
    attendee_name = serializers.CharField(source="registration.full_name", read_only=True)
    conference_title = serializers.CharField(source="registration.ticket_category.conference.title", read_only=True)
    company_name = serializers.CharField(source="registration.ticket_category.conference.company.name", read_only=True)
    ticket_name = serializers.CharField(source="registration.ticket_category.name", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()
    payment_reference = serializers.SerializerMethodField()
    original_payment_method = serializers.CharField(source="registration.payment_method", read_only=True)

    class Meta:
        model = Refund
        fields = ("public_id", "registration_code", "attendee_name", "conference_title", "company_name", "ticket_name", "method", "original_payment_method", "status", "amount_minor_units", "currency", "reason", "payment_reference", "paystack_refund_id", "gateway_message", "expected_at", "requested_by_name", "completed_by_name", "processed_at", "created_at")

    def get_requested_by_name(self, refund):
        return refund.requested_by.get_full_name() or refund.requested_by.get_username()

    def get_completed_by_name(self, refund):
        if refund.completed_by:
            return refund.completed_by.get_full_name() or refund.completed_by.get_username()
        if refund.method == Refund.Method.PAYSTACK:
            return "Paystack" if refund.status == Refund.Status.PROCESSED else "Paystack reported failure" if refund.status == Refund.Status.FAILED else "Awaiting provider"
        return "Not recorded"

    def get_payment_reference(self, refund):
        if refund.payment_id:
            return refund.payment.reference
        collection = getattr(refund.registration, "offline_collection", None)
        return collection.receipt_reference if collection else ""


class RefundCreateSerializer(serializers.Serializer):
    registration_code = serializers.CharField(max_length=40)
    amount_minor_units = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=300, allow_blank=False)


class SettlementSerializer(serializers.ModelSerializer):
    transaction_count = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = ("paystack_id", "status", "currency", "total_amount_minor_units", "effective_amount_minor_units", "total_fees_minor_units", "total_processed_minor_units", "settlement_date", "synced_at", "transaction_count")

    def get_transaction_count(self, settlement):
        return settlement.transaction_count if hasattr(settlement, "transaction_count") else settlement.transactions.count()


class SettlementTransactionSerializer(serializers.ModelSerializer):
    registration_code = serializers.CharField(source="payment.registration.registration_code", read_only=True, allow_null=True)

    class Meta:
        model = SettlementTransaction
        fields = ("paystack_id", "reference", "status", "amount_minor_units", "currency", "channel", "message", "paid_at", "registration_code")
