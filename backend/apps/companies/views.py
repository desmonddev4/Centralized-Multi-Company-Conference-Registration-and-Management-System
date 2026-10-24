from django.db.models import Count
from rest_framework import viewsets

from apps.audit.services import record_audit
from apps.core.permissions import HasRequiredModelPermission
from .models import Company
from .serializers import CompanySerializer


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = (HasRequiredModelPermission,)
    queryset = Company.objects.annotate(conference_count=Count("conferences")).order_by("name")

    def get_permissions(self):
        if self.request.method == "POST":
            self.required_permission = "companies.add_company"
        elif self.request.method in ("PUT", "PATCH"):
            self.required_permission = "companies.change_company"
        elif self.request.method == "DELETE":
            self.required_permission = "companies.delete_company"
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated or not user.has_perm("companies.view_company"):
            queryset = queryset.filter(is_active=True)
        return queryset

    def perform_create(self, serializer):
        company = serializer.save()
        record_audit(action="company.created", summary="Company record created", request=self.request, target_type="company", target_id=company.pk, details={"name": company.name})

    def perform_update(self, serializer):
        previous_active = serializer.instance.is_active
        company = serializer.save()
        action = "company.activated" if not previous_active and company.is_active else "company.deactivated" if previous_active and not company.is_active else "company.updated"
        record_audit(action=action, summary="Company record updated", request=self.request, target_type="company", target_id=company.pk, details={"name": company.name, "is_active": company.is_active})
