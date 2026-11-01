
from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "business",
            "description",
            "category",
            "amount",
            "date",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
