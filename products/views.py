
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Product, StockMovement
from .serializers import ProductSerializer, StockMovementSerializer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Product.objects.select_related("business").all()
        business_id = self.request.query_params.get("businessId")

        if business_id:
            queryset = queryset.filter(business_id=business_id)

        return queryset


@api_view(["GET", "POST"])
def stock_movement_list(request):
    business_id = request.query_params.get("businessId")

    if not business_id:
        return Response(
            {"businessId": "A business ID is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        movements = StockMovement.objects.select_related(
            "product",
            "product__business",
        ).filter(product__business_id=business_id)

        return Response(
            StockMovementSerializer(movements, many=True).data
        )

    serializer = StockMovementSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    product_id = serializer.validated_data["product"].id
    movement_type = serializer.validated_data["movement_type"]
    quantity = serializer.validated_data["quantity"]
    note = serializer.validated_data.get("note", "").strip()

    with transaction.atomic():
        product = get_object_or_404(
            Product.objects.select_for_update(),
            pk=product_id,
            business_id=business_id,
        )

        previous_quantity = product.quantity

        if movement_type == "received":
            if quantity <= 0:
                return Response(
                    {"quantity": "Received quantity must be greater than zero."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_quantity = previous_quantity + quantity

        elif movement_type == "adjusted":
            new_quantity = quantity

        elif movement_type == "removed":
            if quantity <= 0:
                return Response(
                    {"quantity": "Removed quantity must be greater than zero."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if quantity > previous_quantity:
                return Response(
                    {"quantity": "You cannot remove more stock than is available."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            new_quantity = previous_quantity - quantity

        else:
            return Response(
                {"movementType": "Invalid stock movement type."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        movement = StockMovement.objects.create(
            product=product,
            movement_type=movement_type,
            quantity=quantity,
            change=new_quantity - previous_quantity,
            previous_quantity=previous_quantity,
            new_quantity=new_quantity,
            note=note,
        )

        product.quantity = new_quantity
        product.save(update_fields=["quantity", "updated_at"])

    return Response(
        StockMovementSerializer(movement).data,
        status=status.HTTP_201_CREATED,
    )
