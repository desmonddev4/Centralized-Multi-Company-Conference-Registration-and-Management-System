from rest_framework import viewsets
from apps.core.permissions import HasRequiredModelPermission
from apps.audit.services import record_audit
from .models import AgendaSession, Conference, TicketCategory
from .serializers import AgendaSessionSerializer, ConferenceSerializer, TicketCategorySerializer


class AgendaSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AgendaSessionSerializer
    permission_classes = (HasRequiredModelPermission,)

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            self.required_permission = self._permission_for("events.change_agendasession", "events.change_conference")
        elif self.request.method == "DELETE":
            self.required_permission = self._permission_for("events.delete_agendasession", "events.change_conference")
        else:
            self.required_permission = self._permission_for("events.add_agendasession", "events.change_conference")
        return super().get_permissions()

    def _permission_for(self, agenda_permission, conference_permission):
        user = self.request.user
        if user.is_authenticated and user.has_perm(agenda_permission):
            return agenda_permission
        return conference_permission

    def get_queryset(self):
        queryset = AgendaSession.objects.select_related("conference")
        if not self.request.user.is_authenticated or not self.request.user.has_perm("events.view_conference"):
            queryset = queryset.filter(conference__status=Conference.Status.PUBLISHED)
        conference = self.request.query_params.get("conference")
        return queryset.filter(conference__slug=conference) if conference else queryset

    def perform_create(self, serializer):
        session = serializer.save()
        record_audit(action="agenda_session.created", summary="Conference agenda session created", request=self.request, target_type="agenda_session", target_id=session.pk, details={"conference": session.conference.slug, "title": session.title})

    def perform_update(self, serializer):
        session = serializer.save()
        record_audit(action="agenda_session.updated", summary="Conference agenda session updated", request=self.request, target_type="agenda_session", target_id=session.pk, details={"conference": session.conference.slug, "title": session.title})

    def perform_destroy(self, instance):
        record_audit(action="agenda_session.deleted", summary="Conference agenda session deleted", request=self.request, target_type="agenda_session", target_id=instance.pk, details={"conference": instance.conference.slug, "title": instance.title})
        instance.delete()


class ConferenceViewSet(viewsets.ModelViewSet):
    serializer_class = ConferenceSerializer
    permission_classes = (HasRequiredModelPermission,)
    lookup_field = "slug"

    def perform_create(self, serializer):
        conference = serializer.save()
        record_audit(action="conference.created", summary="Conference created", request=self.request, target_type="conference", target_id=conference.slug, details={"company_id": conference.company_id})

    def perform_update(self, serializer):
        conference = serializer.save()
        record_audit(action="conference.updated", summary="Conference updated", request=self.request, target_type="conference", target_id=conference.slug, details={"status": conference.status})

    def perform_destroy(self, instance):
        record_audit(action="conference.deleted", summary="Conference deleted", request=self.request, target_type="conference", target_id=instance.slug)
        instance.delete()

    def get_permissions(self):
        if self.request.method == "POST":
            self.required_permission = "events.add_conference"
        elif self.request.method in ("PUT", "PATCH"):
            self.required_permission = "events.change_conference"
        elif self.request.method == "DELETE":
            self.required_permission = "events.delete_conference"
        return super().get_permissions()

    def get_queryset(self):
        queryset = Conference.objects.select_related("company").prefetch_related("ticket_categories", "agenda_sessions")
        if not self.request.user.is_authenticated or not self.request.user.has_perm("events.view_conference"):
            queryset = queryset.filter(status=Conference.Status.PUBLISHED)
        status = self.request.query_params.get("status")
        if status and self.request.user.is_authenticated:
            queryset = queryset.filter(status=status)
        company_id = self.request.query_params.get("company")
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        return queryset


class TicketCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = TicketCategorySerializer
    permission_classes = (HasRequiredModelPermission,)

    def get_permissions(self):
        if self.request.method == "POST":
            self.required_permission = "events.add_ticketcategory"
        elif self.request.method in ("PUT", "PATCH"):
            self.required_permission = "events.change_ticketcategory"
        elif self.request.method == "DELETE":
            self.required_permission = "events.delete_ticketcategory"
        return super().get_permissions()

    def get_parent_conference(self):
        queryset = Conference.objects.filter(public_id=self.kwargs["conference_public_id"])
        if not self.request.user.is_authenticated or not self.request.user.has_perm("events.view_conference"):
            queryset = queryset.filter(status=Conference.Status.PUBLISHED)
        return queryset.first()

    def get_queryset(self):
        conference = self.get_parent_conference()
        if conference is None:
            return TicketCategory.objects.none()
        return TicketCategory.objects.filter(conference=conference).select_related("conference")

    def perform_create(self, serializer):
        conference = self.get_parent_conference()
        if conference is None:
            from rest_framework.exceptions import NotFound
            raise NotFound("Conference not found.")
        serializer.save(conference=conference)
