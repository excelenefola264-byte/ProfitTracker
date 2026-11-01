
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, stock_movement_list

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")

urlpatterns = [
    *router.urls,
    path(
        "stock-movements/",
        stock_movement_list,
        name="stock-movement-list",
    ),
]
