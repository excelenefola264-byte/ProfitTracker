
from django.db import models
from business.models import Business
from products.models import Product


class Sale(models.Model):
    PAYMENT_METHODS = [
        ("Cash", "Cash"),
        ("Transfer", "Bank Transfer"),
        ("Card", "Card"),
        ("Other", "Other"),
    ]

    STATUS_CHOICES = [
        ("Completed", "Completed"),
    ]

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="sales",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="sales",
    )
    sale_id = models.CharField(max_length=100, unique=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHODS,
        default="Cash",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Completed",
    )
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sale_id} - {self.product.name}"
