from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("checkin", "0002_alter_checkinrecord_id"),
        ("registrations", "0004_attendee_kiosk_profile"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="checkinrecord",
            name="checked_in_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="check_ins",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
