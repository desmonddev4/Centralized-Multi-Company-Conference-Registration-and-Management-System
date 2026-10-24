from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.events.urls")),
    path("api/companies/", include("apps.companies.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/walk-ins/", include("apps.registrations.walkin_urls")),
    path("api/check-ins/", include("apps.checkin.urls")),
    path("api/tickets/", include("apps.ticketing.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/reporting/", include("apps.reporting.urls")),
    path("api/", include("apps.core.urls")),
]
