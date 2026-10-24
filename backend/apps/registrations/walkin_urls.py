from django.urls import path
from .walkin_views import WalkInRegistrationView

urlpatterns = [path("", WalkInRegistrationView.as_view(), name="walk-in-registration")]
