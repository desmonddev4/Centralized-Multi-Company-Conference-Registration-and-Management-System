from django.urls import path
from .views import ReportingDashboardView

urlpatterns = [path("dashboard/", ReportingDashboardView.as_view(), name="reporting-dashboard")]
