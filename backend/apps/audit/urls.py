
from django.urls import path
from .views import AuditEntryListView

urlpatterns = [path("", AuditEntryListView.as_view(), name="audit-entry-list")]
