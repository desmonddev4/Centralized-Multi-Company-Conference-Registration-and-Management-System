from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [("registrations", "0003_registration_payment_method"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name="CheckInRecord", fields=[
        ("id", models.BigAutoField(primary_key=True, serialize=False)),
        ("checked_in_at", models.DateTimeField(auto_now_add=True)),
        ("checked_in_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="check_ins", to=settings.AUTH_USER_MODEL)),
        ("registration", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="check_in", to="registrations.registration")),
    ], options={"ordering": ["-checked_in_at"]})]
