from urllib.parse import urlparse

from django.conf import settings as django_settings
from django.db import connections
from django.db.migrations.executor import MigrationExecutor
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import record_audit
from .models import PlatformSettings
from .permissions import HasModelPermission
from .serializers import PlatformSettingsSerializer


class SystemReadinessView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "core.change_platformsettings"

    def get(self, request):
        checks = []
        database = connections["default"]
        try:
            with database.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            checks.append({"key": "database", "label": "Database", "status": "ok", "detail": f"{database.vendor.capitalize()} database is reachable."})
        except Exception:
            checks.append({"key": "database", "label": "Database", "status": "error", "detail": "The application could not connect to its database."})

        try:
            executor = MigrationExecutor(database)
            pending = executor.migration_plan(executor.loader.graph.leaf_nodes())
            checks.append({"key": "migrations", "label": "Database migrations", "status": "warning" if pending else "ok", "detail": f"{len(pending)} migration(s) need to be applied." if pending else "All database migrations are applied."})
        except Exception:
            checks.append({"key": "migrations", "label": "Database migrations", "status": "error", "detail": "Migration state could not be read."})

        secret_key = getattr(django_settings, "SECRET_KEY", "")
        weak_secret = not secret_key or secret_key == "development-only-change-me" or len(secret_key) < 32
        checks.append({"key": "secret_key", "label": "Django secret key", "status": "warning" if weak_secret else "ok", "detail": "Replace the development or short secret key before production." if weak_secret else "A non-default secret key is configured."})
        debug = bool(getattr(django_settings, "DEBUG", False))
        checks.append({"key": "debug", "label": "Debug mode", "status": "warning" if debug else "ok", "detail": "Debug mode is enabled; disable it for production." if debug else "Debug mode is disabled."})

        paystack_key = getattr(django_settings, "PAYSTACK_SECRET_KEY", "") or ""
        paystack_mode = "live" if paystack_key.startswith("sk_live_") else "test" if paystack_key.startswith("sk_test_") else "unconfigured"
        checks.append({"key": "paystack", "label": "Paystack", "status": "ok" if paystack_mode == "live" else "warning", "detail": "Live payment credentials are configured." if paystack_mode == "live" else "Test credentials are configured." if paystack_mode == "test" else "Payment credentials are not configured."})

        email_backend = getattr(django_settings, "EMAIL_BACKEND", "")
        if email_backend.endswith("console.EmailBackend"):
            email_status = "warning"
            email_detail = "Emails are written to the backend console, not delivered to attendees."
        elif email_backend.endswith("smtp.EmailBackend"):
            ready = bool(getattr(django_settings, "EMAIL_HOST", "") and getattr(django_settings, "DEFAULT_FROM_EMAIL", ""))
            email_status = "ok" if ready else "error"
            email_detail = "SMTP host and sender are configured; live delivery has not been tested." if ready else "Configure both the SMTP host and sender address."
        else:
            email_status = "warning"
            email_detail = "A custom email backend is configured; live delivery has not been tested."
        checks.append({"key": "email", "label": "Ticket and staff email", "status": email_status, "detail": email_detail})

        frontend = urlparse(getattr(django_settings, "FRONTEND_URL", ""))
        frontend_ok = frontend.scheme in ("http", "https") and bool(frontend.netloc)
        frontend_secure = debug or frontend.scheme == "https"
        checks.append({"key": "frontend_url", "label": "Public frontend URL", "status": "ok" if frontend_ok and frontend_secure else "warning", "detail": "A valid frontend URL is configured." if frontend_ok and frontend_secure else "Configure a valid HTTPS frontend URL for production."})

        overall = "error" if any(item["status"] == "error" for item in checks) else "warning" if any(item["status"] == "warning" for item in checks) else "ok"
        return Response({"overall_status": overall, "checks": checks})


class PlatformSettingsView(APIView):
    required_permission = "core.change_platformsettings"

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [HasModelPermission()]

    def get(self, request):
        settings = PlatformSettings.get_solo()
        return Response(PlatformSettingsSerializer(settings).data)

    def patch(self, request):
        settings = PlatformSettings.get_solo()
        before = {
            "platform_name": settings.platform_name,
            "support_email": settings.support_email,
            "support_phone": settings.support_phone,
            "registration_hold_minutes": settings.registration_hold_minutes,
        }
        serializer = PlatformSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        after = {
            "platform_name": updated.platform_name,
            "support_email": updated.support_email,
            "support_phone": updated.support_phone,
            "registration_hold_minutes": updated.registration_hold_minutes,
        }
        changes = {key: {"from": before[key], "to": after[key]} for key in before if before[key] != after[key]}
        if changes:
            record_audit(action="platform.settings_updated", summary="Platform settings updated", request=request, target_type="platform_settings", target_id="1", details={"changes": changes})
        return Response(serializer.data)
