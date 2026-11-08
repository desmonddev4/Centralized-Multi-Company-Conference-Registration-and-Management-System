import re

from django.db import migrations, models


def populate_normalized_phones(apps, schema_editor):
    Registration = apps.get_model("registrations", "Registration")
    batch = []
    for registration in Registration.objects.only("pk", "phone").iterator():
        registration.phone_normalized = re.sub(r"\D", "", registration.phone)[:15]
        batch.append(registration)
        if len(batch) == 1000:
            Registration.objects.bulk_update(batch, ["phone_normalized"])
            batch.clear()
    if batch:
        Registration.objects.bulk_update(batch, ["phone_normalized"])


class Migration(migrations.Migration):
    dependencies = [("registrations", "0003_registration_payment_method")]

    operations = [
        migrations.AddField(
            model_name="registration",
            name="phone_normalized",
            field=models.CharField(blank=True, db_index=True, max_length=15),
        ),
        migrations.AddField(
            model_name="registration",
            name="job_title",
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name="registration",
            name="organization",
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name="registration",
            name="attendee_role",
            field=models.CharField(
                blank=True,
                choices=[
                    ("attendee", "Attendee"),
                    ("speaker", "Speaker"),
                    ("sponsor", "Sponsor"),
                    ("exhibitor", "Exhibitor"),
                    ("organizer", "Organizer"),
                    ("media", "Media"),
                    ("other", "Other"),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(populate_normalized_phones, migrations.RunPython.noop),
    ]
