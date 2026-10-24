from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.events.views import AgendaSessionViewSet, ConferenceViewSet, TicketCategoryViewSet
from apps.registrations.views import PublicRegistrationCreateView, RegistrationAdminViewSet, RegistrationLookupView

router = DefaultRouter()
router.register("events", ConferenceViewSet, basename="event")
router.register("agenda-sessions", AgendaSessionViewSet, basename="agenda-session")
router.register("registrations", RegistrationAdminViewSet, basename="registration")

ticket_categories = TicketCategoryViewSet.as_view({"get": "list", "post": "create"})
ticket_category_detail = TicketCategoryViewSet.as_view({"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"})

urlpatterns = [
    path("", include(router.urls)),
    path("events/<slug:conference_slug>/registrations/", PublicRegistrationCreateView.as_view(), name="public-registration-create"),
    path("registration-codes/<str:registration_code>/", RegistrationLookupView.as_view(), name="registration-lookup"),
    path("events/<uuid:conference_public_id>/ticket-categories/", ticket_categories, name="event-ticket-categories"),
    path("events/<uuid:conference_public_id>/ticket-categories/<int:pk>/", ticket_category_detail, name="event-ticket-category-detail"),
]
