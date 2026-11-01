
from rest_framework import serializers
from .models import Sale


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    class Meta:
        model = Sale
        fields = [
            "id",
            "business",
            "product",
            "product_name",
            "sale_id",
            "quantity",
            "unit_price",
            "total_amount",
            "payment_method",
            "status",
            "date",
            "created_at",
        ]
        read_only_fields = [
             "id",
            "sale_id",
            "unit_price",
            "total_amount",
            "status",
            "created_at",
        ]
