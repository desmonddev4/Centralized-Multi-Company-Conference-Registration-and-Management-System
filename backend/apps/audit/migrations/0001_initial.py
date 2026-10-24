from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name="AuditEntry", fields=[
        ("id", models.BigAutoField(primary_key=True, serialize=False)),
        ("action", models.CharField(db_index=True, max_length=80)),
        ("target_type", models.CharField(blank=True, db_index=True, max_length=80)),
        ("target_id", models.CharField(blank=True, db_index=True, max_length=100)),
        ("summary", models.CharField(max_length=240)),
        ("details", models.JSONField(blank=True, default=dict)),
        ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
        ("user_agent", models.CharField(blank=True, max_length=300)),
        ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
        ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_entries", to=settings.AUTH_USER_MODEL)),
    ], options={"ordering": ["-created_at"]})]
