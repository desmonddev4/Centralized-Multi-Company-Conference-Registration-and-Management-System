from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="PlatformSettings",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ("platform_name", models.CharField(default="ConferenceHub", max_length=80)),
                ("support_email", models.EmailField(blank=True, max_length=254)),
                ("support_phone", models.CharField(blank=True, max_length=40)),
                ("registration_hold_minutes", models.PositiveSmallIntegerField(default=15, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(120)])),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "platform settings", "verbose_name_plural": "platform settings"},
        ),
    ]
