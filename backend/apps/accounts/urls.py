from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminLoginView,
    ClienteEmailCheckView,
    ClienteCheckoutRegisterView,
    ClienteForgotPasswordView,
    ClienteLoginView,
    ClienteLogoutView,
    ClienteMeView,
    ClienteViewSet,
)

router = DefaultRouter()
router.register("clientes", ClienteViewSet, basename="clientes")

urlpatterns = [
    path("clientes/registro/", ClienteCheckoutRegisterView.as_view(), name="clientes-registro"),
    path("clientes/login/", ClienteLoginView.as_view(), name="clientes-login"),
    path("clientes/logout/", ClienteLogoutView.as_view(), name="clientes-logout"),
    path("clientes/me/", ClienteMeView.as_view(), name="clientes-me"),
    path("clientes/check-email/", ClienteEmailCheckView.as_view(), name="clientes-check-email"),
    path(
        "clientes/forgot-password/",
        ClienteForgotPasswordView.as_view(),
        name="clientes-forgot-password",
    ),
    path("admin/login/", AdminLoginView.as_view(), name="admin-login"),
    *router.urls,
]
