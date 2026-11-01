
from django.contrib import admin
from .models import Sale


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        "sale_id",
        "business",
        "product",
        "quantity",
        "total_amount",
        "payment_method",
        "date",
        "status",
    )
    list_filter = ("payment_method", "status", "date")
    search_fields = ("sale_id", "product__name", "business__business_name")
    readonly_fields = ("created_at",)
