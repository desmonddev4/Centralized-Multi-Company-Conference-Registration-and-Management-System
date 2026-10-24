import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [("registrations", "0003_registration_payment_method")]
    operations = [migrations.CreateModel(
        name="IssuedTicket",
        fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
            ("issued_at", models.DateTimeField(auto_now_add=True)),
            ("email_sent_at", models.DateTimeField(blank=True, null=True)),
            ("email_error", models.CharField(blank=True, max_length=300)),
            ("registration", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="issued_ticket", to="registrations.registration")),
        ],
    )]
