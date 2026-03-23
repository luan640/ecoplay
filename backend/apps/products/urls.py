from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, PublicCategoriasView, PublicPlataformasView, PublicSubplataformasView, PublicVitrinasListView, QuoteProductSearchView, ShowcaseProductsView

router = DefaultRouter()
router.register("produtos", ProductViewSet, basename="produtos")

urlpatterns = [
    path("plataformas/", PublicPlataformasView.as_view(), name="public-plataformas"),
    path("categorias/", PublicCategoriasView.as_view(), name="public-categorias"),
    path("subplataformas/", PublicSubplataformasView.as_view(), name="public-subplataformas"),
    path("cotacao/produtos/", QuoteProductSearchView.as_view(), name="cotacao-produtos-search"),
    path("vitrines/", PublicVitrinasListView.as_view(), name="vitrine-list"),
    path("vitrines/<slug:slug>/", ShowcaseProductsView.as_view(), name="vitrine-products"),
    *router.urls,
]
