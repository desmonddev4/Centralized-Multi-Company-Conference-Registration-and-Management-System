import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [("companies", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="Conference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("slug", models.SlugField(blank=True, max_length=220, unique=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("banner_url", models.URLField(blank=True)),
                ("venue_name", models.CharField(blank=True, max_length=180)),
                ("venue_address", models.CharField(blank=True, max_length=300)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("registration_opens_at", models.DateTimeField(blank=True, null=True)),
                ("registration_closes_at", models.DateTimeField(blank=True, null=True)),
                ("capacity", models.PositiveIntegerField(blank=True, null=True)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("published", "Published"), ("cancelled", "Cancelled"), ("archived", "Archived")], default="draft", max_length=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="conferences", to="companies.company")),
            ],
            options={"ordering": ["starts_at", "title"]},
        ),
        migrations.CreateModel(
            name="TicketCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("description", models.CharField(blank=True, max_length=300)),
                ("price_minor_units", models.PositiveBigIntegerField(default=0)),
                ("currency", models.CharField(default="GHS", max_length=3)),
                ("quantity_available", models.PositiveIntegerField()),
                ("max_per_registration", models.PositiveSmallIntegerField(default=1)),
                ("sales_open_at", models.DateTimeField(blank=True, null=True)),
                ("sales_close_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("conference", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ticket_categories", to="events.conference")),
            ],
            options={"ordering": ["sort_order", "price_minor_units", "name"]},
        ),
        migrations.AddConstraint(
            model_name="ticketcategory",
            constraint=models.UniqueConstraint(fields=("conference", "name"), name="unique_ticket_name_per_conference"),
        ),
    ]
