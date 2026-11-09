import hashlib
import hmac
import json
import urllib.error
import urllib.request
from urllib.parse import urlencode
from django.db.models import Sum
from django.utils.dateparse import parse_datetime
from django.db.models import Q

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.registrations.models import Registration
from apps.audit.services import record_audit
from apps.ticketing.services import issue_ticket_by_id
from .currency import paystack_charge
from .models import Payment, Refund, Settlement, SettlementTransaction


class GatewayUnavailable(APIException):
    status_code = 502
    default_detail = "Payment service is temporarily unavailable. Please try again."
    default_code = "payment_gateway_unavailable"


def paystack_request(path, payload=None, query=None, include_meta=False):
    secret = getattr(settings, "PAYSTACK_SECRET_KEY", "")
    if not secret:
        raise GatewayUnavailable("Paystack is not configured. Add PAYSTACK_SECRET_KEY to the backend environment.")
    body = json.dumps(payload).encode() if payload is not None else None
    query_string = "?" + urlencode(query) if query else ""
    request = urllib.request.Request(
        "https://api.paystack.co" + path + query_string, data=body,
        headers={"Authorization": "Bearer " + secret, "Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            result = json.loads(response.read().decode())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise GatewayUnavailable() from exc
    if not result.get("status"):
        raise GatewayUnavailable(result.get("message") or "Paystack could not process this request.")
    data = result.get("data", {})
    return (data, result.get("meta", {})) if include_meta else data


REFUND_ACTIVE_STATUSES = (
    Refund.Status.INITIALIZING, Refund.Status.PENDING, Refund.Status.PROCESSING,
    Refund.Status.NEEDS_ATTENTION, Refund.Status.UNKNOWN, Refund.Status.PROCESSED,
)


def _refund_status(status_value):
    status_map = {
        "pending": Refund.Status.PENDING, "processing": Refund.Status.PROCESSING,
        "processed": Refund.Status.PROCESSED, "failed": Refund.Status.FAILED,
        "needs-attention": Refund.Status.NEEDS_ATTENTION, "needs_attention": Refund.Status.NEEDS_ATTENTION,
        "reversed": Refund.Status.REVERSED,
    }
    return status_map.get(str(status_value or "").lower(), Refund.Status.UNKNOWN)


def _apply_refund_data(refund, data):
    refund.status = _refund_status(data.get("status"))
    refund.paystack_refund_id = data.get("id") or refund.paystack_refund_id
    refund.gateway_message = str(data.get("message", data.get("reason", "")))[:400]
    refund.expected_at = parse_datetime(data["expected_at"]) if data.get("expected_at") else refund.expected_at
    if refund.status == Refund.Status.PROCESSED:
        refund.processed_at = parse_datetime(data.get("refunded_at") or data.get("updatedAt")) or timezone.now()
    refund.save(update_fields=["status", "paystack_refund_id", "gateway_message", "expected_at", "processed_at", "updated_at"])
    return refund


def request_refund(*, registration_code, amount_minor_units, reason, actor):
    with transaction.atomic():
        registration = Registration.objects.select_for_update().filter(registration_code=registration_code).first()
        if not registration:
            raise ValidationError("Registration was not found.")
        if registration.amount_due_minor_units <= 0 or not registration.payment_received_at:
            raise ValidationError("This registration has no recorded payment to refund.")
        if registration.status not in (Registration.Status.CONFIRMED, Registration.Status.PAYMENT_REVIEW, Registration.Status.CANCELLED):
            raise ValidationError("Only paid registrations can be refunded.")
        try:
            amount = int(amount_minor_units)
        except (TypeError, ValueError):
            raise ValidationError({"amount_minor_units": "Enter the refund amount in minor currency units."})
        if amount <= 0:
            raise ValidationError({"amount_minor_units": "Refund amount must be greater than zero."})
        totals = Refund.objects.filter(registration=registration, status__in=REFUND_ACTIVE_STATUSES).aggregate(total=Sum("amount_minor_units"))
        already_reserved = totals["total"] or 0
        method_map = {
            Registration.PaymentMethod.PAYSTACK: Refund.Method.PAYSTACK,
            Registration.PaymentMethod.CASH: Refund.Method.CASH,
            Registration.PaymentMethod.MOMO: Refund.Method.MOMO,
        }
        method = method_map.get(registration.payment_method)
        if method is None:
            raise ValidationError("This payment method cannot be refunded in this system.")
        if method == Refund.Method.PAYSTACK and not getattr(settings, "PAYSTACK_SECRET_KEY", ""):
            raise GatewayUnavailable("Paystack is not configured. Add PAYSTACK_SECRET_KEY to the backend environment.")
        payment = None
        if method == Refund.Method.PAYSTACK:
            payment = Payment.objects.select_for_update().filter(registration=registration, status=Payment.Status.SUCCEEDED).order_by("-paid_at").first()
            if payment is None:
                raise ValidationError("No successful Paystack transaction is recorded for this registration.")
            refundable_amount = payment.amount_minor_units
            refund_currency = payment.currency
        else:
            refundable_amount = registration.amount_due_minor_units
            refund_currency = registration.currency
        if amount + already_reserved > refundable_amount:
            raise ValidationError({"amount_minor_units": "Refund exceeds the remaining refundable amount."})
        refund = Refund.objects.create(
            registration=registration, payment=payment, method=method,
            status=Refund.Status.INITIALIZING if method == Refund.Method.PAYSTACK else Refund.Status.PROCESSED,
            amount_minor_units=amount, currency=refund_currency, reason=reason.strip()[:300],
            requested_by=actor, completed_by=None if method == Refund.Method.PAYSTACK else actor,
            processed_at=None if method == Refund.Method.PAYSTACK else timezone.now(),
        )
    if method != Refund.Method.PAYSTACK:
        record_audit(action="refund.offline_recorded", summary="Cash or MoMo refund recorded as paid", actor=actor, target_type="registration", target_id=registration.registration_code, details={"amount_minor_units": amount, "currency": registration.currency, "method": method})
        return refund
    try:
        data = paystack_request("/refund", {
            "transaction": payment.paystack_transaction_id or payment.reference,
            "amount": amount,
            "currency": payment.currency,
            "customer_note": reason.strip()[:300],
            "merchant_note": reason.strip()[:300],
        })
        refund = _apply_refund_data(refund, data)
    except GatewayUnavailable as exc:
        refund.status = Refund.Status.UNKNOWN
        refund.gateway_message = str(exc)[:400]
        refund.save(update_fields=["status", "gateway_message", "updated_at"])
    record_audit(action="refund.paystack_submitted", summary="Paystack refund submitted", actor=actor, target_type="registration", target_id=registration.registration_code, details={"refund_id": refund.paystack_refund_id, "amount_minor_units": amount, "currency": registration.currency, "status": refund.status})
    return refund


def refresh_refund(refund, actor=None):
    if refund.method != Refund.Method.PAYSTACK or not refund.paystack_refund_id:
        raise ValidationError("This refund has no Paystack refund ID to refresh.")
    data = paystack_request("/refund/" + str(refund.paystack_refund_id))
    old_status = refund.status
    refund = _apply_refund_data(refund, data)
    if old_status != refund.status:
        record_audit(action="refund.status_updated", summary="Refund status refreshed from Paystack", actor=actor, target_type="registration", target_id=refund.registration.registration_code, details={"refund_id": refund.paystack_refund_id, "status": refund.status})
    return refund


def sync_settlements(*, page=1, per_page=50):
    items, meta = paystack_request("/settlement", query={"perPage": per_page, "page": page}, include_meta=True)
    settlements = []
    for item in items:
        settlement, _ = Settlement.objects.update_or_create(
            paystack_id=item["id"],
            defaults={
                "status": item.get("status", "unknown"), "currency": item.get("currency", ""),
                "total_amount_minor_units": item.get("total_amount") or 0,
                "effective_amount_minor_units": item.get("effective_amount") or 0,
                "total_fees_minor_units": item.get("total_fees") or 0,
                "total_processed_minor_units": item.get("total_processed") or 0,
                "settlement_date": parse_datetime(item["settlement_date"]) if item.get("settlement_date") else None,
                "source_data": item,
            },
        )
        settlements.append(settlement)
    return settlements, meta


def sync_settlement_transactions(settlement, *, page=1, per_page=100):
    items, meta = paystack_request(
        f"/settlement/{settlement.paystack_id}/transactions",
        query={"perPage": per_page, "page": page}, include_meta=True,
    )
    for item in items:
        payment = Payment.objects.filter(reference=item.get("reference", ""), status=Payment.Status.SUCCEEDED).first()
        if payment and (payment.amount_minor_units != item.get("amount") or payment.currency.upper() != str(item.get("currency", "")).upper()):
            payment = None
        SettlementTransaction.objects.update_or_create(
            settlement=settlement, paystack_id=item["id"],
            defaults={
                "reference": item.get("reference", ""), "status": item.get("status", "unknown"),
                "amount_minor_units": item.get("amount") or 0, "currency": item.get("currency", ""),
                "channel": item.get("channel", "") or "", "message": item.get("message", "") or "",
                "paid_at": parse_datetime(item["paid_at"]) if item.get("paid_at") else None,
                "payment": payment, "source_data": item,
            },
        )
    return meta


def initialize_payment(registration_code):
    with transaction.atomic():
        registration = Registration.objects.select_for_update().select_related("ticket_category").filter(registration_code=registration_code).first()
        if registration is None:
            raise ValidationError("Registration was not found.")
        if registration.status != Registration.Status.PENDING_PAYMENT:
            raise ValidationError("This registration is not awaiting payment.")
        now = timezone.now()
        if registration.hold_expires_at and registration.hold_expires_at <= now:
            registration.expire_if_due()
            raise ValidationError("The ticket reservation has expired. Please register again.")
        if registration.amount_due_minor_units <= 0:
            raise ValidationError("This registration does not require online payment.")
        amount_minor_units, currency = paystack_charge(registration.amount_due_minor_units, registration.currency)
        existing = Payment.objects.filter(
            registration=registration, status=Payment.Status.INITIALIZED,
            authorization_url__gt="", amount_minor_units=amount_minor_units, currency=currency,
        ).order_by("-created_at").first()
        if existing:
            return existing
        reference = "CONF-" + __import__("uuid").uuid4().hex
        payment = Payment.objects.create(
            registration=registration, reference=reference,
            amount_minor_units=amount_minor_units, currency=currency,
        )
        callback = getattr(settings, "PAYSTACK_CALLBACK_URL", "") or getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/") + "/payment/result"
        data = paystack_request("/transaction/initialize", {
            "email": registration.email, "amount": payment.amount_minor_units,
            "currency": payment.currency, "reference": payment.reference,
            "callback_url": callback, "channels": ["card", "mobile_money"],
            "metadata": {"registration_code": registration.registration_code},
        })
        payment.authorization_url = data.get("authorization_url", "")
        payment.access_code = data.get("access_code", "")
        payment.status = Payment.Status.INITIALIZED
        payment.initialized_at = now
        payment.save(update_fields=["authorization_url", "access_code", "status", "initialized_at", "updated_at"])
        record_audit(action="payment.initialized", summary="Online payment initialized", target_type="registration", target_id=registration.registration_code, details={"reference": payment.reference, "amount_minor_units": payment.amount_minor_units, "currency": payment.currency})
        return payment


def apply_verified_result(payment, data):
    expected_amount = payment.amount_minor_units
    actual_ref = str(data.get("reference", ""))
    actual_amount = data.get("amount")
    actual_currency = str(data.get("currency", "")).upper()
    if data.get("status") != "success":
        previous_status = payment.status
        status_map = {"failed": Payment.Status.FAILED, "abandoned": Payment.Status.ABANDONED, "pending": Payment.Status.PENDING}
        payment.status = status_map.get(data.get("status"), Payment.Status.PENDING)
        payment.gateway_response = str(data.get("gateway_response", ""))[:400]
        payment.save(update_fields=["status", "gateway_response", "updated_at"])
        if previous_status != payment.status:
            record_audit(action="payment." + payment.status, summary="Online payment status updated", target_type="registration", target_id=payment.registration.registration_code, details={"reference": payment.reference, "gateway_status": data.get("status", "unknown")})
        return payment
    if actual_ref != payment.reference or actual_amount != expected_amount or actual_currency != payment.currency.upper():
        previous_status = payment.status
        payment.status = Payment.Status.REVIEW
        payment.gateway_response = "Paystack success values did not match the expected payment."
        payment.save(update_fields=["status", "gateway_response", "updated_at"])
        if previous_status != Payment.Status.REVIEW:
            record_audit(action="payment.review_required", summary="Payment details did not match the expected charge", target_type="registration", target_id=payment.registration.registration_code, details={"reference": payment.reference, "expected_amount": expected_amount, "received_amount": actual_amount, "expected_currency": payment.currency, "received_currency": actual_currency})
        return payment
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        registration = Registration.objects.select_for_update().select_related("ticket_category", "ticket_category__conference").get(pk=payment.registration_id)
        if payment.status == Payment.Status.SUCCEEDED:
            return payment
        if payment.status == Payment.Status.REVIEW and registration.status == Registration.Status.PAYMENT_REVIEW:
            return payment
        payment.status = Payment.Status.SUCCEEDED
        payment.gateway_response = str(data.get("gateway_response", ""))[:400]
        payment.paystack_transaction_id = data.get("id")
        payment.paid_at = parse_datetime(data["paid_at"]) if data.get("paid_at") else timezone.now()
        payment.save(update_fields=["status", "gateway_response", "paystack_transaction_id", "paid_at", "updated_at"])
        registration.payment_method = Registration.PaymentMethod.PAYSTACK
        registration.payment_received_at = payment.paid_at
        if registration.status == Registration.Status.CONFIRMED:
            registration.save(update_fields=["payment_method", "payment_received_at", "updated_at"])
            transaction.on_commit(lambda registration_id=registration.pk: issue_ticket_by_id(registration_id))
            record_audit(action="payment.succeeded", summary="Online payment verified", target_type="registration", target_id=registration.registration_code, details={"reference": payment.reference, "amount_minor_units": payment.amount_minor_units, "currency": payment.currency})
            return payment
        if registration.status != Registration.Status.PENDING_PAYMENT and registration.status != Registration.Status.EXPIRED:
            payment.status = Payment.Status.REVIEW
            registration.status = Registration.Status.PAYMENT_REVIEW
        else:
            now = timezone.now()
            category = registration.ticket_category
            conference = category.conference
            reserved = Q(status=Registration.Status.CONFIRMED) | Q(
                status=Registration.Status.PENDING_PAYMENT, hold_expires_at__gt=now,
            )
            category_count = Registration.objects.filter(ticket_category=category).filter(reserved).exclude(pk=registration.pk).count()
            all_confirmed = Registration.objects.filter(ticket_category__conference=conference).filter(reserved).exclude(pk=registration.pk).count()
            if category_count < category.quantity_available and (conference.capacity is None or all_confirmed < conference.capacity):
                registration.status = Registration.Status.CONFIRMED
            else:
                payment.status = Payment.Status.REVIEW
                registration.status = Registration.Status.PAYMENT_REVIEW
        registration.save(update_fields=["status", "payment_method", "payment_received_at", "updated_at"])
        if registration.status == Registration.Status.CONFIRMED:
            transaction.on_commit(lambda registration_id=registration.pk: issue_ticket_by_id(registration_id))
        if payment.status == Payment.Status.REVIEW:
            payment.save(update_fields=["status", "updated_at"])
        record_audit(
            action="payment.review_required" if payment.status == Payment.Status.REVIEW else "payment.succeeded",
            summary="Payment requires staff review" if payment.status == Payment.Status.REVIEW else "Online payment verified",
            target_type="registration", target_id=registration.registration_code,
            details={"reference": payment.reference, "amount_minor_units": payment.amount_minor_units, "currency": payment.currency, "registration_status": registration.status},
        )
        return payment


def verify_payment(reference):
    payment = Payment.objects.filter(reference=reference).first()
    if not payment:
        raise ValidationError("Payment reference was not found.")
    data = paystack_request("/transaction/verify/" + reference)
    return apply_verified_result(payment, data)


def valid_webhook_signature(raw_body, signature):
    secret = getattr(settings, "PAYSTACK_SECRET_KEY", "")
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha512).hexdigest() if secret else ""
    return bool(expected and signature and hmac.compare_digest(expected, signature))
