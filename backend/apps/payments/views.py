import hashlib
import json

from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from apps.core.permissions import HasModelPermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Conference, TicketCategory
from apps.registrations.models import Registration
from apps.ticketing.services import issue_ticket_by_id
from .models import OfflineCollection, PaystackWebhookEvent, Payment, Refund, Settlement, SettlementTransaction
from .serializers import OfflineCollectionSerializer, PaymentPublicSerializer, PaymentReviewResolveSerializer, PaymentReviewSerializer, RefundSerializer, RefundCreateSerializer, SettlementSerializer, SettlementTransactionSerializer
from .services import (initialize_payment, valid_webhook_signature, verify_payment, request_refund,
                       refresh_refund, sync_settlements, sync_settlement_transactions, _refund_status)
from apps.audit.services import record_audit


class PaymentInitializeView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, registration_code):
        payment = initialize_payment(registration_code)
        return Response(PaymentPublicSerializer(payment).data, status=status.HTTP_200_OK)


class PaymentVerifyView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, reference):
        payment = verify_payment(reference)
        return Response(PaymentPublicSerializer(payment).data)


class PaystackWebhookView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        raw = request.body
        signature = request.headers.get("x-paystack-signature", "")
        if not valid_webhook_signature(raw, signature):
            return Response({"detail": "Invalid webhook signature."}, status=status.HTTP_400_BAD_REQUEST)
        digest = hashlib.sha256(raw).hexdigest()
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return Response({"detail": "Invalid JSON payload."}, status=status.HTTP_400_BAD_REQUEST)
        event_type = str(payload.get("event", ""))[:80]
        data = payload.get("data", {})
        reference = str(data.get("reference") or data.get("transaction_reference") or "")[:80]
        event, created = PaystackWebhookEvent.objects.get_or_create(
            payload_digest=digest,
            defaults={"event_type": event_type, "reference": reference},
        )
        if not created and event.status == PaystackWebhookEvent.Status.PROCESSED:
            return Response({"received": True})
        if event_type.startswith("refund."):
            try:
                event.status = PaystackWebhookEvent.Status.PROCESSING
                event.save(update_fields=["status"])
                refund_id = data.get("id") or data.get("refund_id")
                refund = Refund.objects.filter(paystack_refund_id=refund_id).first() if refund_id else None
                if refund is None and reference:
                    candidates = Refund.objects.filter(payment__reference=reference, method=Refund.Method.PAYSTACK).exclude(status__in=[Refund.Status.FAILED, Refund.Status.REVERSED])
                    amount = data.get("amount")
                    if amount is not None:
                        candidates = candidates.filter(amount_minor_units=amount)
                    if candidates.count() == 1:
                        refund = candidates.first()
                if refund:
                    old_status = refund.status
                    refund.status = _refund_status(event_type.removeprefix("refund."))
                    refund.paystack_refund_id = refund_id or refund.paystack_refund_id
                    refund.gateway_message = str(data.get("message") or data.get("reason") or "")[:400]
                    if refund.status == Refund.Status.PROCESSED:
                        refund.processed_at = timezone.now()
                    refund.save(update_fields=["status", "paystack_refund_id", "gateway_message", "processed_at", "updated_at"])
                    if old_status != refund.status:
                        record_audit(action="refund.status_updated", summary="Refund status updated from Paystack webhook", target_type="registration", target_id=refund.registration.registration_code, details={"refund_id": refund.paystack_refund_id, "status": refund.status})
            except Exception as exc:
                event.status = PaystackWebhookEvent.Status.FAILED
                event.error_message = str(exc)[:300]
                event.save(update_fields=["status", "error_message"])
                return Response({"detail": "Webhook processing failed; retry delivery."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            event.status = PaystackWebhookEvent.Status.PROCESSED
            event.processed_at = timezone.now()
            event.save(update_fields=["status", "processed_at"])
            return Response({"received": True})
        if event_type != "charge.success" or not reference:
            event.status = PaystackWebhookEvent.Status.PROCESSED
            event.processed_at = timezone.now()
            event.save(update_fields=["status", "processed_at"])
            return Response({"received": True})
        try:
            event.status = PaystackWebhookEvent.Status.PROCESSING
            event.save(update_fields=["status"])
            verify_payment(reference)
        except Exception as exc:
            event.status = PaystackWebhookEvent.Status.FAILED
            event.error_message = str(exc)[:300]
            event.save(update_fields=["status", "error_message"])
            return Response({"detail": "Webhook processing failed; retry delivery."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        event.status = PaystackWebhookEvent.Status.PROCESSED
        event.processed_at = timezone.now()
        event.save(update_fields=["status", "processed_at"])
        return Response({"received": True})


class PaymentAdminListView(generics.ListAPIView):
    permission_classes = (HasModelPermission,)
    required_permission = "payments.view_payment"
    serializer_class = PaymentPublicSerializer
    queryset = Payment.objects.select_related("registration").all()


class OfflineCollectionListView(generics.ListAPIView):
    permission_classes = (HasModelPermission,)
    required_permission = "payments.view_payment"
    serializer_class = OfflineCollectionSerializer

    def get_queryset(self):
        queryset = OfflineCollection.objects.select_related(
            "received_by", "registration", "registration__ticket_category",
            "registration__ticket_category__conference", "registration__ticket_category__conference__company",
        )
        method = self.request.query_params.get("method")
        if method:
            if method not in (OfflineCollection.Method.CASH, OfflineCollection.Method.MOMO):
                raise ValidationError({"method": "Choose cash or momo."})
            queryset = queryset.filter(method=method)
        conference = self.request.query_params.get("conference")
        if conference:
            queryset = queryset.filter(registration__ticket_category__conference__slug=conference)
        for query_name, lookup in (("from", "received_at__date__gte"), ("to", "received_at__date__lte")):
            raw = self.request.query_params.get(query_name)
            if raw:
                parsed = parse_date(raw)
                if parsed is None:
                    raise ValidationError({query_name: "Enter a valid date in YYYY-MM-DD format."})
                queryset = queryset.filter(**{lookup: parsed})
        return queryset


class PaymentReviewListView(generics.ListAPIView):
    permission_classes = (HasModelPermission,)
    required_permission = "payments.view_payment"
    serializer_class = PaymentReviewSerializer

    def get_queryset(self):
        review_payments = Payment.objects.filter(
            status=Payment.Status.REVIEW,
            paystack_transaction_id__isnull=False,
            paid_at__isnull=False,
        ).order_by("-paid_at", "-created_at")
        return Registration.objects.filter(
            status=Registration.Status.PAYMENT_REVIEW,
            payment_received_at__isnull=False,
            payments__in=review_payments,
        ).select_related(
            "ticket_category", "ticket_category__conference", "ticket_category__conference__company",
        ).prefetch_related(Prefetch("payments", queryset=review_payments, to_attr="review_payments")).distinct()


class PaymentReviewResolveView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = staticmethod(
        lambda request, view: "payments.change_payment"
        if request.user.has_perm("payments.change_payment")
        else "payments.add_refund"
    )

    @transaction.atomic
    def post(self, request, registration_code):
        payload = PaymentReviewResolveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        action = payload.validated_data["action"]
        reason = payload.validated_data["reason"]

        registration = Registration.objects.select_for_update().select_related("ticket_category").filter(
            registration_code=registration_code,
        ).first()
        if registration is None:
            raise ValidationError("Registration was not found.")
        if registration.status != Registration.Status.PAYMENT_REVIEW:
            raise ValidationError("This registration is no longer awaiting payment review.")
        payment = Payment.objects.select_for_update().filter(
            registration=registration,
            status=Payment.Status.REVIEW,
            paystack_transaction_id__isnull=False,
            paid_at__isnull=False,
        ).order_by("-paid_at", "-created_at").first()
        if payment is None:
            raise ValidationError("No verified Paystack payment is attached to this review.")

        if action == "confirm":
            conference = Conference.objects.select_for_update().get(pk=registration.ticket_category.conference_id)
            category = TicketCategory.objects.select_for_update().get(pk=registration.ticket_category_id)
            now = timezone.now()
            if conference.status != Conference.Status.PUBLISHED or conference.ends_at <= now:
                raise ValidationError("This conference is no longer active, so the registration cannot be confirmed.")
            if not category.is_active:
                raise ValidationError("This ticket category is inactive. Reactivate it before confirming the registration.")
            reserved = Q(status=Registration.Status.CONFIRMED) | Q(
                status=Registration.Status.PENDING_PAYMENT,
                hold_expires_at__gt=now,
            )
            category_count = Registration.objects.filter(ticket_category=category).filter(reserved).exclude(pk=registration.pk).count()
            conference_count = Registration.objects.filter(ticket_category__conference=conference).filter(reserved).exclude(pk=registration.pk).count()
            if category_count >= category.quantity_available:
                raise ValidationError("This ticket category is still at capacity. Free a place before confirming this payment.")
            if conference.capacity is not None and conference_count >= conference.capacity:
                raise ValidationError("This conference is still at capacity. Free a place before confirming this payment.")

            registration.status = Registration.Status.CONFIRMED
            registration.save(update_fields=["status", "updated_at"])
            payment.status = Payment.Status.SUCCEEDED
            payment.save(update_fields=["status", "updated_at"])
            record_audit(
                action="payment_review.confirmed", summary="Paid registration confirmed after capacity review",
                request=request, target_type="registration", target_id=registration.registration_code,
                details={"payment_reference": payment.reference},
            )
            transaction.on_commit(lambda registration_id=registration.pk: issue_ticket_by_id(registration_id))
            return Response({"detail": "Payment verified and registration confirmed.", "status": registration.status, "refund_required": False})

        registration.status = Registration.Status.CANCELLED
        registration.save(update_fields=["status", "updated_at"])
        payment.status = Payment.Status.SUCCEEDED
        payment.save(update_fields=["status", "updated_at"])
        record_audit(
            action="payment_review.cancelled", summary="Paid registration cancelled after capacity review",
            request=request, target_type="registration", target_id=registration.registration_code,
            details={"payment_reference": payment.reference, "reason": reason},
        )
        return Response({"detail": "Registration cancelled. Record the attendee’s refund from the Refunds page.", "status": registration.status, "refund_required": True})


class RefundListCreateView(generics.ListAPIView):
    permission_classes = (HasModelPermission,)
    serializer_class = RefundSerializer
    queryset = Refund.objects.select_related("registration", "registration__ticket_category", "registration__ticket_category__conference", "registration__ticket_category__conference__company", "registration__offline_collection", "payment", "requested_by", "completed_by").all()
    required_permission = staticmethod(lambda request, view: "payments.add_refund" if request.method == "POST" else "payments.view_refund")

    def post(self, request):
        serializer = RefundCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund = request_refund(actor=request.user, **serializer.validated_data)
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)


class RefundRefreshView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "payments.change_refund"

    def post(self, request, public_id):
        refund = Refund.objects.select_related("registration").filter(public_id=public_id).first()
        if not refund:
            raise ValidationError("Refund was not found.")
        return Response(RefundSerializer(refresh_refund(refund, actor=request.user)).data)


class SettlementListView(generics.ListAPIView):
    permission_classes = (HasModelPermission,)
    required_permission = "payments.view_settlement"
    serializer_class = SettlementSerializer
    queryset = Settlement.objects.annotate(transaction_count=Count("transactions"))


class SettlementSyncView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "payments.view_settlement"

    def post(self, request):
        try:
            page = max(1, int(request.data.get("page", 1)))
            per_page = min(100, max(1, int(request.data.get("per_page", 50))))
        except (TypeError, ValueError):
            raise ValidationError("Page values must be positive integers.")
        rows, meta = sync_settlements(page=page, per_page=per_page)
        record_audit(action="settlements.synced", summary="Paystack settlements synchronized", request=request, target_type="settlement", target_id="page:" + str(page), details={"count": len(rows)})
        return Response({"results": SettlementSerializer(rows, many=True, context={"request": request}).data, "meta": meta})


class SettlementTransactionsView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "payments.view_settlement"

    def get(self, request, paystack_id):
        settlement = Settlement.objects.filter(paystack_id=paystack_id).first()
        if not settlement:
            raise ValidationError("Sync settlements before opening this settlement.")
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            raise ValidationError("Page must be a positive integer.")
        meta = sync_settlement_transactions(settlement, page=page)
        record_audit(action="settlement.transactions_synced", summary="Paystack settlement transactions synchronized", request=request, target_type="settlement", target_id=settlement.paystack_id, details={"page": page})
        rows = settlement.transactions.select_related("payment__registration")
        return Response({"results": SettlementTransactionSerializer(rows, many=True).data, "meta": meta})
