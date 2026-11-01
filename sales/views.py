
from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.db.models import Sum, Count, Avg
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from business.models import Business
from products.models import Product, StockMovement
from .models import Sale
from .serializers import SaleSerializer


class SaleListCreateView(generics.ListCreateAPIView):
    serializer_class = SaleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Sale.objects.select_related(
            "business", "product"
        ).all()

        business_id = self.request.query_params.get("businessId")

        if business_id:
            queryset = queryset.filter(business_id=business_id)

        return queryset

    def create(self, request, *args, **kwargs):
        business_id = request.data.get(
            "business",
            request.data.get("businessId"),
        )
        product_id = request.data.get(
            "product",
            request.data.get("productId"),
        )
        quantity_value = request.data.get("quantity")
        payment_method = request.data.get(
            "payment_method",
            request.data.get("paymentMethod", "Cash"),
        )
        sale_date = request.data.get(
            "date",
            request.data.get("saleDate"),
        ) or timezone.localdate()

        try:
            quantity = int(quantity_value)

            if (
                quantity < 1
                or str(quantity) != str(quantity_value).strip()
            ):
                raise ValueError

        except (TypeError, ValueError):
            raise ValidationError({
                "quantity": (
                    "Quantity must be a whole number greater than zero."
                )
            })

        allowed_methods = {"Cash", "Transfer", "Card", "Other"}

        if payment_method not in allowed_methods:
            raise ValidationError({
                "payment_method": "Choose a valid payment method."
            })

        try:
            business = Business.objects.get(pk=business_id)

        except (Business.DoesNotExist, ValueError, TypeError):
            raise ValidationError({
                "business": "Choose a valid business."
            })

        with transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(
                    pk=product_id,
                    business=business,
                )

            except (Product.DoesNotExist, ValueError, TypeError):
                raise ValidationError({
                    "product": (
                        "The product was not found in this business."
                    )
                })

            if product.quantity < quantity:
                raise ValidationError({
                    "quantity": (
                        f"Only {product.quantity} unit(s) "
                        "are currently in stock."
                    )
                })

            unit_price = product.selling_price

            if unit_price <= Decimal("0"):
                raise ValidationError({
                    "product": (
                        "This product has no valid selling price."
                    )
                })

            previous_quantity = product.quantity
            new_quantity = previous_quantity - quantity
            total_amount = unit_price * quantity

            sale = Sale.objects.create(
                business=business,
                product=product,
                sale_id=f"SALE-{uuid4().hex[:16].upper()}",
                quantity=quantity,
                unit_price=unit_price,
                total_amount=total_amount,
                payment_method=payment_method,
                date=sale_date,
                status="Completed",
            )

            product.quantity = new_quantity
            product.save(update_fields=["quantity", "updated_at"])

            StockMovement.objects.create(
                product=product,
                movement_type="removed",
                quantity=quantity,
                change=-quantity,
                previous_quantity=previous_quantity,
                new_quantity=new_quantity,
                note=f"Sale {sale.sale_id}",
            )

        return Response(
            SaleSerializer(sale).data,
            status=status.HTTP_201_CREATED,
        )


class SaleDetailView(generics.RetrieveAPIView):
    serializer_class = SaleSerializer
    permission_classes = [AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        queryset = Sale.objects.select_related(
            "business", "product"
        )

        business_id = self.request.query_params.get("businessId")

        if business_id:
            queryset = queryset.filter(business_id=business_id)

        return queryset


class SalesSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        business_id = request.query_params.get("businessId")
        queryset = Sale.objects.all()

        if business_id:
            queryset = queryset.filter(business_id=business_id)

        summary = queryset.aggregate(
            total_sales=Sum("total_amount"),
            number_of_sales=Count("id"),
            average_sale=Avg("total_amount"),
        )

        return Response({
            "totalSales": summary["total_sales"] or Decimal("0.00"),
            "numberOfSales": summary["number_of_sales"] or 0,
            "averageSale": summary["average_sale"] or Decimal("0.00"),
        })
