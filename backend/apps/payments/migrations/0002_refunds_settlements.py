import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("payments", "0001_initial"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="Refund", fields=[
            ("id", models.BigAutoField(primary_key=True, serialize=False)),
            ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
            ("method", models.CharField(choices=[("paystack", "Paystack"), ("cash", "Cash"), ("momo", "Mobile money")], max_length=12)),
            ("status", models.CharField(choices=[("initializing", "Submitting"), ("pending", "Pending"), ("processing", "Processing"), ("processed", "Processed"), ("failed", "Failed"), ("needs_attention", "Needs attention"), ("reversed", "Reversed"), ("unknown", "Needs reconciliation")], max_length=20)),
            ("amount_minor_units", models.PositiveBigIntegerField()), ("currency", models.CharField(max_length=3)),
            ("reason", models.CharField(max_length=300)), ("paystack_refund_id", models.PositiveBigIntegerField(blank=True, null=True, unique=True)),
            ("gateway_message", models.CharField(blank=True, max_length=400)), ("expected_at", models.DateTimeField(blank=True, null=True)),
            ("processed_at", models.DateTimeField(blank=True, null=True)), ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("completed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="completed_refunds", to=settings.AUTH_USER_MODEL)),
            ("payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="refunds", to="payments.payment")),
            ("registration", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="refunds", to="registrations.registration")),
            ("requested_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="requested_refunds", to=settings.AUTH_USER_MODEL)),
        ], options={"ordering": ["-created_at"]}),
        migrations.AddIndex(model_name="refund", index=models.Index(fields=["registration", "status"], name="refund_reg_status_idx")),
        migrations.CreateModel(name="Settlement", fields=[
            ("id", models.BigAutoField(primary_key=True, serialize=False)), ("paystack_id", models.PositiveBigIntegerField(unique=True)),
            ("status", models.CharField(max_length=20)), ("currency", models.CharField(max_length=3)),
            ("total_amount_minor_units", models.PositiveBigIntegerField(default=0)), ("effective_amount_minor_units", models.PositiveBigIntegerField(default=0)),
            ("total_fees_minor_units", models.PositiveBigIntegerField(default=0)), ("total_processed_minor_units", models.PositiveBigIntegerField(default=0)),
            ("settlement_date", models.DateTimeField(blank=True, null=True)), ("source_data", models.JSONField(blank=True, default=dict)),
            ("synced_at", models.DateTimeField(auto_now=True)),
        ], options={"ordering": ["-settlement_date", "-paystack_id"]}),
        migrations.CreateModel(name="SettlementTransaction", fields=[
            ("id", models.BigAutoField(primary_key=True, serialize=False)), ("paystack_id", models.PositiveBigIntegerField()),
            ("reference", models.CharField(db_index=True, max_length=80)), ("status", models.CharField(max_length=30)),
            ("amount_minor_units", models.PositiveBigIntegerField(default=0)), ("currency", models.CharField(max_length=3)),
            ("channel", models.CharField(blank=True, max_length=40)), ("message", models.CharField(blank=True, max_length=300)),
            ("paid_at", models.DateTimeField(blank=True, null=True)), ("source_data", models.JSONField(blank=True, default=dict)),
            ("payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="settlement_entries", to="payments.payment")),
            ("settlement", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="transactions", to="payments.settlement")),
        ], options={"ordering": ["-paid_at", "-paystack_id"]}),
        migrations.AddConstraint(model_name="settlementtransaction", constraint=models.UniqueConstraint(fields=("settlement", "paystack_id"), name="unique_settlement_transaction")),
    ]
