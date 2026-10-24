
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasModelPermission
from .models import AuditEntry
from .serializers import AuditEntrySerializer


class AuditEntryListView(APIView):
    permission_classes = (HasModelPermission,)
    required_permission = "audit.view_auditentry"

    def get(self, request):
        queryset = AuditEntry.objects.select_related("actor").all()
        action = request.query_params.get("action", "").strip()
        target = request.query_params.get("target", "").strip()
        search = request.query_params.get("search", "").strip()
        if action:
            queryset = queryset.filter(action=action)
        if target:
            queryset = queryset.filter(target_type=target)
        if search:
            queryset = queryset.filter(Q(summary__icontains=search) | Q(target_id__icontains=search) | Q(actor__username__icontains=search) | Q(actor__first_name__icontains=search) | Q(actor__last_name__icontains=search))
        count = queryset.count()
        try:
            offset = max(0, int(request.query_params.get("offset", "0")))
            limit = min(200, max(1, int(request.query_params.get("limit", "50"))))
        except ValueError:
            offset, limit = 0, 50
        rows = queryset[offset:offset + limit]
        return Response({"count": count, "offset": offset, "limit": limit, "results": AuditEntrySerializer(rows, many=True).data})
