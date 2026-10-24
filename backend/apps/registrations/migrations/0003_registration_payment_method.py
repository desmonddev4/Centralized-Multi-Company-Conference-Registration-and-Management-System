from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("registrations", "0002_registration_payment_review")]
    operations = [
        migrations.AddField(model_name="registration", name="payment_method", field=models.CharField(choices=[("none", "No payment required"), ("paystack", "Paystack"), ("cash", "Cash"), ("momo", "Mobile money")], default="none", max_length=12)),
        migrations.AddField(model_name="registration", name="payment_received_at", field=models.DateTimeField(blank=True, null=True)),
    ]
