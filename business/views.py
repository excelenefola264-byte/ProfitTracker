from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Business
from .serializers import BusinessSerializer


@api_view(["GET", "POST"])
def business_list(request):
    if request.method == "GET":
        businesses = Business.objects.all().order_by("-created_at")
        serializer = BusinessSerializer(businesses, many=True)
        return Response(serializer.data)

    serializer = BusinessSerializer(data=request.data)

    if serializer.is_valid():
        business = serializer.save()

        return Response(
            {
                "id": business.id,
                "businessName": business.business_name,
                "businessType": business.business_type,
                "industry": business.industry,
                "businessModel": business.business_model,
                "currency": business.currency,
                "email": business.email,
                "phone": business.phone,
                "createdAt": business.created_at,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH", "PUT"])
def business_detail(request, pk):
    try:
        business = Business.objects.get(pk=pk)
    except Business.DoesNotExist:
        return Response(
            {"detail": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = BusinessSerializer(business)
        return Response(serializer.data)

    serializer = BusinessSerializer(
        business,
        data=request.data,
        partial=request.method == "PATCH",
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)