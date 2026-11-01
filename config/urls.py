
from django.contrib import admin
from django.urls import include, path
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("business.urls")),
    path("api/", include("products.urls")),
    path("api/", include("sales.urls")),
    path("api/", include("expenses.urls")),
]
