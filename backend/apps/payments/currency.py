from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from rest_framework.exceptions import ValidationError


def paystack_charge(amount_minor_units, currency):
    currency = currency.upper()
    if currency == "GHS":
        return amount_minor_units, "GHS"
    if currency == "USD":
        rate = settings.PAYSTACK_USD_TO_GHS_RATE
        if rate <= 0:
            raise ValueError("PAYSTACK_USD_TO_GHS_RATE must be greater than zero.")
        amount = (Decimal(amount_minor_units) * rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return int(amount), "GHS"
    raise ValidationError("Paystack checkout supports tickets priced in USD or GHS.")
