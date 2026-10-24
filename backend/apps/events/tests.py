from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditEntry
from apps.companies.models import Company
from apps.events.models import AgendaSession, Conference, TicketCategory


class ConferenceAdminWorkflowTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Events test company")
        self.owner = get_user_model().objects.create_superuser("events-owner", "owner@example.com", "test-pass")
        now = timezone.now()
        self.starts = now + timedelta(days=10)
        self.ends = now + timedelta(days=11)

    def test_owner_creates_conference_with_ticket_category(self):
        self.client.force_authenticate(self.owner)
        payload = {
            "company": self.company.pk,
            "title": "Annual Leadership Forum",
            "starts_at": self.starts.isoformat(),
            "ends_at": self.ends.isoformat(),
            "status": Conference.Status.PUBLISHED,
            "capacity": 100,
            "ticket_categories": [{
                "name": "General Admission", "price_minor_units": 25000,
                "currency": "GHS", "quantity_available": 80,
                "max_per_registration": 2, "is_active": True,
            }],
        }

        response = self.client.post("/api/events/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        conference = Conference.objects.get(slug="annual-leadership-forum")
        category = TicketCategory.objects.get(conference=conference)
        self.assertEqual(category.price_minor_units, 25000)
        self.assertEqual(category.quantity_available, 80)
        self.assertTrue(AuditEntry.objects.filter(action="conference.created", target_id=conference.slug).exists())

    def test_public_conference_list_hides_drafts(self):
        Conference.objects.create(company=self.company, title="Published forum", starts_at=self.starts, ends_at=self.ends, status=Conference.Status.PUBLISHED)
        Conference.objects.create(company=self.company, title="Private draft", starts_at=self.starts, ends_at=self.ends, status=Conference.Status.DRAFT)

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([event["title"] for event in response.data], ["Published forum"])

    def test_agenda_session_must_fit_conference_schedule(self):
        conference = Conference.objects.create(company=self.company, title="Agenda forum", starts_at=self.starts, ends_at=self.ends, status=Conference.Status.PUBLISHED)
        self.client.force_authenticate(self.owner)
        endpoint = "/api/agenda-sessions/"
        valid_payload = {
            "conference": conference.pk,
            "title": "Opening remarks",
            "starts_at": (self.starts + timedelta(hours=1)).isoformat(),
            "ends_at": (self.starts + timedelta(hours=2)).isoformat(),
        }
        valid = self.client.post(endpoint, valid_payload, format="json")
        invalid = self.client.post(endpoint, {
            **valid_payload,
            "title": "Out of bounds",
            "starts_at": (self.ends + timedelta(hours=1)).isoformat(),
            "ends_at": (self.ends + timedelta(hours=2)).isoformat(),
        }, format="json")

        self.assertEqual(valid.status_code, status.HTTP_201_CREATED, valid.data)
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AgendaSession.objects.filter(conference=conference).count(), 1)
