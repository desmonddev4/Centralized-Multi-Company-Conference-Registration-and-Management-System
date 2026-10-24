import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify


class Company(models.Model):
    name = models.CharField(max_length=160, unique=True)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    logo_url = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:160] or uuid.uuid4().hex[:8]
            candidate = base
            index = 2
            while Company.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
                candidate = f"{base}-{index}"
                index += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


