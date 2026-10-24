from collections import defaultdict
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.checkin.models import CheckInRecord
from apps.core.permissions import HasModelPermission
from apps.events.models import Conference
from apps.payments.models import Refund
from apps.registrations.models import Registration


PERIOD_DAYS = {"30d": 30, "90d": 90, "12m": 365}


def _month_start(value):
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_months(value, count):
    month_index = value.month - 1 + count
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return value.replace(year=year, month=month, day=1)


def _money_by_currency(rows):
    totals = defaultdict(int)
    for currency, amount in rows:
        totals[currency] += amount or 0
    return [{"currency": currency, "amount_minor_units": amount} for currency, amount in sorted(totals.items())]


def build_report(period="12m", conference_slug="", include_finance=True):
    now = timezone.now()
    if period not in (*PERIOD_DAYS, "all"):
        raise ValidationError({"period": "Choose 30d, 90d, 12m, or all."})
    period_start = now - timedelta(days=PERIOD_DAYS[period]) if period in PERIOD_DAYS else None
    registration_scope = Registration.objects.select_related("ticket_category__conference")
    if conference_slug:
        registration_scope = registration_scope.filter(ticket_category__conference__slug=conference_slug)
        if not Conference.objects.filter(slug=conference_slug).exists():
            raise ValidationError({"conference": "Conference was not found."})

    filtered = registration_scope.filter(created_at__gte=period_start) if period_start else registration_scope
    confirmed = filtered.filter(status=Registration.Status.CONFIRMED)
    paid = filtered.filter(payment_received_at__isnull=False)
    checkins = CheckInRecord.objects.filter(registration__in=filtered)
    if period_start:
        checkins = checkins.filter(checked_in_at__gte=period_start)
    registration_count = filtered.count()
    confirmed_count = confirmed.count()
    checkin_count = checkins.count()
    revenue = _money_by_currency(paid.values("currency").annotate(total=Sum("amount_due_minor_units")).values_list("currency", "total")) if include_finance else []
    processed_refunds = Refund.objects.filter(status=Refund.Status.PROCESSED, registration__in=filtered)
    refunds = _money_by_currency(processed_refunds.values("currency").annotate(total=Sum("amount_minor_units")).values_list("currency", "total")) if include_finance else []
    refund_amounts = {row["currency"]: row["amount_minor_units"] for row in refunds}
    net_revenue = [{"currency": row["currency"], "amount_minor_units": row["amount_minor_units"] - refund_amounts.get(row["currency"], 0)} for row in revenue]

    if period == "30d":
        bucket_count, bucket_kind = 30, "day"
        bucket_start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "90d":
        bucket_count, bucket_kind = 13, "week"
        bucket_start = (now - timedelta(weeks=12)).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        bucket_count, bucket_kind = 12, "month"
        bucket_start = _month_start(now)
        bucket_start = _add_months(bucket_start, -11)
    buckets = []
    for i in range(bucket_count):
        start = bucket_start + (timedelta(days=i) if bucket_kind == "day" else timedelta(weeks=i) if bucket_kind == "week" else timedelta(days=0))
        if bucket_kind == "month":
            start = _add_months(bucket_start, i)
            end = _add_months(start, 1)
            label = start.strftime("%b %Y")
        elif bucket_kind == "week":
            end = start + timedelta(weeks=1)
            label = start.strftime("%d %b")
        else:
            end = start + timedelta(days=1)
            label = start.strftime("%d %b")
        buckets.append({"start": start, "end": end, "label": label, "registrations": 0, "check_ins": 0})
    for item in filtered.values_list("created_at", flat=True):
        for bucket in buckets:
            if bucket["start"] <= item < bucket["end"]:
                bucket["registrations"] += 1
                break
    for item in checkins.values_list("checked_in_at", flat=True):
        for bucket in buckets:
            if bucket["start"] <= item < bucket["end"]:
                bucket["check_ins"] += 1
                break

    conferences = list(Conference.objects.select_related("company").all().order_by("starts_at"))
    if conference_slug:
        conferences = [item for item in conferences if item.slug == conference_slug]
    performance = []
    for event in conferences:
        event_regs = filtered.filter(ticket_category__conference=event)
        event_paid = paid.filter(ticket_category__conference=event)
        revenue_by_currency = _money_by_currency(event_paid.values("currency").annotate(total=Sum("amount_due_minor_units")).values_list("currency", "total")) if include_finance else []
        performance.append({
            "slug": event.slug, "title": event.title, "company_name": event.company.name,
            "starts_at": event.starts_at, "status": event.status,
            "registration_count": event_regs.count(), "confirmed_count": event_regs.filter(status=Registration.Status.CONFIRMED).count(),
            "revenue_by_currency": revenue_by_currency,
        })
    performance.sort(key=lambda row: (row["registration_count"], row["title"]), reverse=True)
    performance = performance[:50]

    upcoming_qs = Conference.objects.filter(status=Conference.Status.PUBLISHED, starts_at__gte=now).order_by("starts_at")
    if conference_slug:
        upcoming_qs = upcoming_qs.filter(slug=conference_slug)
    upcoming = [{
        "slug": event.slug, "title": event.title, "venue_name": event.venue_name,
        "starts_at": event.starts_at,
        "registration_count": registration_scope.filter(ticket_category__conference=event).exclude(status=Registration.Status.CANCELLED).count(),
    } for event in upcoming_qs[:5]]

    return {
        "period": period,
        "conference": conference_slug or None,
        "financial_access": include_finance,
        "summary": {
            "registration_count": registration_count, "confirmed_count": confirmed_count,
            "paid_registration_count": paid.count() if include_finance else None, "check_in_count": checkin_count,
            "check_in_rate": round(checkin_count * 100 / confirmed_count, 1) if confirmed_count else 0,
            "gross_revenue": revenue, "processed_refunds": refunds, "net_revenue": net_revenue,
        },
        "trend": [{"label": item["label"], "registrations": item["registrations"], "check_ins": item["check_ins"]} for item in buckets],
        "upcoming_conferences": upcoming,
        "conference_performance": performance,
        "generated_at": now,
    }


class ReportingDashboardView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = staticmethod(lambda request, view: "registrations.view_registration")

    def get(self, request):
        user = request.user
        include_finance = bool(user.is_superuser or user.has_perm("payments.view_payment"))
        return Response(build_report(request.query_params.get("period", "12m"), request.query_params.get("conference", ""), include_finance))
