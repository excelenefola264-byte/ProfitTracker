
from rest_framework import serializers
from .models import Product, StockMovement


class ProductSerializer(serializers.ModelSerializer):
    businessId = serializers.PrimaryKeyRelatedField(
        source="business",
        queryset=Product._meta.get_field("business").remote_field.model.objects.all(),
    )
    costPrice = serializers.DecimalField(
        source="cost_price",
        max_digits=12,
        decimal_places=2,
    )
    sellingPrice = serializers.DecimalField(
        source="selling_price",
        max_digits=12,
        decimal_places=2,
    )
    lowStockLevel = serializers.IntegerField(
        source="low_stock_level",
    )
    createdAt = serializers.DateTimeField(
        source="created_at",
        read_only=True,
    )
    updatedAt = serializers.DateTimeField(
        source="updated_at",
        read_only=True,
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "businessId",
            "name",
            "sku",
            "category",
            "costPrice",
            "sellingPrice",
            "quantity",
            "lowStockLevel",
            "createdAt",
            "updatedAt",
        ]

    def validate(self, attrs):
        business = attrs.get(
            "business",
            self.instance.business if self.instance else None,
        )
        sku = attrs.get(
            "sku",
            self.instance.sku if self.instance else None,
        )

        if business and sku:
            existing = Product.objects.filter(
                business=business,
                sku__iexact=sku,
            )

            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)

            if existing.exists():
                raise serializers.ValidationError({
                    "sku": "This SKU already exists for this business."
                })

        return attrs


class StockMovementSerializer(serializers.ModelSerializer):
    productId = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.all(),
    )
    productName = serializers.CharField(
        source="product.name",
        read_only=True,
    )
    sku = serializers.CharField(
        source="product.sku",
        read_only=True,
    )
    movementType = serializers.ChoiceField(
        source="movement_type",
        choices=StockMovement.MOVEMENT_TYPES,
    )
    previousQuantity = serializers.IntegerField(
        source="previous_quantity",
        read_only=True,
    )
    newQuantity = serializers.IntegerField(
        source="new_quantity",
        read_only=True,
    )
    createdAt = serializers.DateTimeField(
        source="created_at",
        read_only=True,
    )

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "productId",
            "productName",
            "sku",
            "movementType",
            "quantity",
            "change",
            "previousQuantity",
            "newQuantity",
            "note",
            "createdAt",
        ]
        read_only_fields = [
            "change",
            "previousQuantity",
            "newQuantity",
            "createdAt",
        ]
