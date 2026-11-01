from django.urls import path
from .views import business_list, business_detail

urlpatterns = [
    path("businesses/", business_list, name="business-list"),
    path("businesses/<int:pk>/", business_detail, name="business-detail"),
]