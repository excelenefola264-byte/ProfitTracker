
from django.db import models


class Business(models.Model):
    BUSINESS_TYPES = [
        ("Retail", "Retail"),
        ("Wholesale", "Wholesale"),
        ("Manufacturing", "Manufacturing"),
        ("Services", "Services"),
        ("Mixed", "Mixed"),
        ("Other", "Other"),
    ]

    BUSINESS_MODELS = [
        ("Products", "Products"),
        ("Services", "Services"),
        ("Both", "Both"),
    ]

    CURRENCIES = [
        ("NGN", "Nigerian Naira"),
        ("USD", "US Dollar"),
        ("GBP", "British Pound"),
        ("EUR", "Euro"),
    ]

    business_name = models.CharField(max_length=200)
    business_type = models.CharField(
        max_length=20,
        choices=BUSINESS_TYPES,
    )
    industry = models.CharField(max_length=100)
    business_model = models.CharField(
        max_length=20,
        choices=BUSINESS_MODELS,
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCIES,
        default="NGN",
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.business_name
