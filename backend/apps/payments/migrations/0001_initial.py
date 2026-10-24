import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [("registrations", "0002_registration_payment_review")]
    operations = [
        migrations.CreateModel(name="Payment", fields=[
            ("id", models.BigAutoField(primary_key=True, serialize=False)),
            ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
            ("reference", models.CharField(db_index=True, max_length=80, unique=True)),
            ("status", models.CharField(choices=[("initializing", "Initializing"), ("initialized", "Initialized"), ("pending", "Pending"), ("failed", "Failed"), ("abandoned", "Abandoned"), ("succeeded", "Succeeded"), ("review", "Needs review")], default="initializing", max_length=20)),
            ("amount_minor_units", models.PositiveBigIntegerField()), ("currency", models.CharField(max_length=3)),
            ("authorization_url", models.URLField(blank=True, max_length=500)), ("access_code", models.CharField(blank=True, max_length=100)),
            ("paystack_transaction_id", models.PositiveBigIntegerField(blank=True, null=True)), ("gateway_response", models.CharField(blank=True, max_length=400)),
            ("initialized_at", models.DateTimeField(blank=True, null=True)), ("paid_at", models.DateTimeField(blank=True, null=True)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("registration", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payments", to="registrations.registration")),
        ], options={"ordering": ["-created_at"]}),
        migrations.AddIndex(model_name="payment", index=models.Index(fields=["registration", "status"], name="payment_reg_status_idx")),
        migrations.CreateModel(name="PaystackWebhookEvent", fields=[
            ("id", models.BigAutoField(primary_key=True, serialize=False)), ("payload_digest", models.CharField(max_length=64, unique=True)),
            ("event_type", models.CharField(max_length=80)), ("reference", models.CharField(blank=True, max_length=80)),
            ("status", models.CharField(choices=[("received", "Received"), ("processing", "Processing"), ("processed", "Processed"), ("failed", "Failed")], default="received", max_length=12)),
            ("error_message", models.CharField(blank=True, max_length=300)), ("received_at", models.DateTimeField(auto_now_add=True)),
            ("processed_at", models.DateTimeField(blank=True, null=True)),
        ], options={"ordering": ["-received_at"]}),
    ]
