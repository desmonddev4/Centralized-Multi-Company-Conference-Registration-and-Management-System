
from django.urls import path
from .views import CheckInLogView, KioskAttendanceView, RegistrationCheckInView

urlpatterns = [
    path("", CheckInLogView.as_view(), name="check-in-log"),
    path("attend/", KioskAttendanceView.as_view(), name="kiosk-attendance"),
    path("<str:registration_code>/", RegistrationCheckInView.as_view(), name="registration-check-in"),
]
