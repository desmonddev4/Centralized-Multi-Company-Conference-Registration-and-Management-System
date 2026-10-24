import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [("events", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="Registration",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("registration_code", models.CharField(db_index=True, editable=False, max_length=24, unique=True)),
                ("full_name", models.CharField(max_length=160)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(blank=True, max_length=40)),
                ("status", models.CharField(choices=[("pending_payment", "Pending payment"), ("confirmed", "Confirmed"), ("cancelled", "Cancelled"), ("expired", "Expired")], max_length=20)),
                ("amount_due_minor_units", models.PositiveBigIntegerField(default=0)),
                ("currency", models.CharField(default="GHS", max_length=3)),
                ("hold_expires_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ticket_category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="registrations", to="events.ticketcategory")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="registration",
            index=models.Index(fields=["ticket_category", "status", "hold_expires_at"], name="reg_ticket_status_exp_idx"),
        ),
    ]

