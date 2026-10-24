from django.urls import path
from .views import TicketDeliveryListView, TicketEmailResendView, TicketView

urlpatterns = [
    path("delivery/", TicketDeliveryListView.as_view(), name="ticket-delivery-list"),
    path("delivery/<str:registration_code>/resend/", TicketEmailResendView.as_view(), name="ticket-email-resend"),
    path("<str:registration_code>/", TicketView.as_view(), name="ticket-detail"),
]
