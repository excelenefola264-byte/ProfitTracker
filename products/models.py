
from django.db import models
from business.models import Business


class Product(models.Model):
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    cost_price = models.DecimalFiel____d(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField(default=0)
    low_stock_level = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["business", "sku"],
                name="unique_product_sku_per_business",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.sku})"


class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ("received", "Stock received"),
        ("adjusted", "Stock adjusted"),
        ("removed", "Stock removed"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="stock_movements",
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MOVEMENT_TYPES,
    )
    quantity = models.PositiveIntegerField()
    change = models.IntegerField()
    previous_quantity = models.PositiveIntegerField()
    new_quantity = models.PositiveIntegerField()
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.product.name}: "
            f"{self.get_movement_type_display()}"
        )
