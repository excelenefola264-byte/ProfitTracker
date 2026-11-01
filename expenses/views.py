
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Expense.objects.select_related("business").all()

        business_id = self.request.query_params.get("businessId")

        if business_id:
            queryset = queryset.filter(business_id=business_id)

        return queryset
