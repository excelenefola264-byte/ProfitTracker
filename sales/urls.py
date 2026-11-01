
from django.urls import path

from .views import (
    SaleListCreateView,
    SaleDetailView,
    SalesSummaryView,
)

urlpatterns = [
    path("sales/", SaleListCreateView.as_view(), name="sales-list-create"),
    path("sales/summary/", SalesSummaryView.as_view(), name="sales-summary"),
    path("sales/<int:pk>/", SaleDetailView.as_view(), name="sales-detail"),
]
