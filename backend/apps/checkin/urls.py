
from django.urls import path
from .views import CheckInLogView, RegistrationCheckInView

urlpatterns = [path("", CheckInLogView.as_view(), name="check-in-log"), path("<str:registration_code>/", RegistrationCheckInView.as_view(), name="registration-check-in")]
