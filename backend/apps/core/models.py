from django.conf import settings as django_settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class PlatformSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    platform_name = models.CharField(max_length=80, default="ConferenceHub")
    support_email = models.EmailField(blank=True)
    support_phone = models.CharField(max_length=40, blank=True)
    registration_hold_minutes = models.PositiveSmallIntegerField(default=15, validators=[MinValueValidator(1), MaxValueValidator(120)])
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "platform settings"
        verbose_name_plural = "platform settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        return super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        configured_name = getattr(django_settings, "PLATFORM_NAME", "ConferenceHub")
        configured_email = getattr(django_settings, "PLATFORM_SUPPORT_EMAIL", "")
        configured_phone = getattr(django_settings, "PLATFORM_SUPPORT_PHONE", "")
        hold_minutes = max(1, min(120, int(getattr(django_settings, "REGISTRATION_HOLD_MINUTES", 15))))
        instance, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                "platform_name": configured_name,
                "support_email": configured_email,
                "support_phone": configured_phone,
                "registration_hold_minutes": hold_minutes,
            },
        )
        return instance

    def __str__(self):
        return self.platform_name
