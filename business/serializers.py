
from rest_framework import serializers
from .models import Business


class BusinessSerializer(serializers.ModelSerializer):
    businessName = serializers.CharField(
        source="business_name",
        max_length=200,
        required=True,
    )
    businessType = serializers.ChoiceField(
        source="business_type",
        choices=Business.BUSINESS_TYPES,
    )
    businessModel = serializers.ChoiceField(
        source="business_model",
        choices=Business.BUSINESS_MODELS,
    )
    createdAt = serializers.DateTimeField(
        source="created_at",
        read_only=True,
    )

    class Meta:
        model = Business
        fields = [
            "id",
            "businessName",
            "businessType",
            "industry",
            "businessModel",
            "currency",
            "email",
            "phone",
            "createdAt",
        ]
