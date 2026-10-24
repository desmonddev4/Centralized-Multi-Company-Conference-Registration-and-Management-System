
from django.urls import path
from .views import PlatformSettingsView, SystemReadinessView

urlpatterns = [path("settings/", PlatformSettingsView.as_view(), name="platform-settings"), path("operations/readiness/", SystemReadinessView.as_view(), name="system-readiness")]
