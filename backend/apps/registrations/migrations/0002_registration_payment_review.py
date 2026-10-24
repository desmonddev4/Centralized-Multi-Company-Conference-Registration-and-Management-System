from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("registrations", "0001_initial")]
    operations = [migrations.AlterField(
        model_name="registration", name="status",
        field=models.CharField(choices=[("pending_payment", "Pending payment"), ("confirmed", "Confirmed"), ("payment_review", "Payment received, needs review"), ("cancelled", "Cancelled"), ("expired", "Expired")], max_length=20),
    )]
