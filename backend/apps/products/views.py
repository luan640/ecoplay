import math

from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import Category, Platform, Subplatform, Product, QuoteProduct, Showcase, StoreSettings, Review
from .serializers import ProductSerializer, QuoteProductSuggestionSerializer, ReviewSerializer, ReviewCreateSerializer


class PublicPlataformasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = Platform.objects.filter(is_active=True)
        if q:
            qs = qs.filter(name__icontains=q)
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = max(1, min(100, int(request.query_params.get("page_size", 20))))
        total = qs.count()
        offset = (page - 1) * page_size
        names = list(qs.values_list("name", flat=True)[offset: offset + page_size])
        return Response({
            "results": names,
            "total": total,
            "page": page,
            "pages": math.ceil(total / page_size) if total else 1,
        })


class PublicCategoriasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = Category.objects.filter(is_active=True)
        if q:
            qs = qs.filter(name__icontains=q)
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = max(1, min(100, int(request.query_params.get("page_size", 20))))
        total = qs.count()
        offset = (page - 1) * page_size
        names = list(qs.values_list("name", flat=True)[offset: offset + page_size])
        return Response({
            "results": names,
            "total": total,
            "page": page,
            "pages": math.ceil(total / page_size) if total else 1,
        })


class PublicSubplataformasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        platform = (request.query_params.get("platform") or "").strip()
        q = (request.query_params.get("q") or "").strip()
        qs = Subplatform.objects.filter(is_active=True).select_related("platform")
        if platform:
            qs = qs.filter(platform__name__iexact=platform)
        if q:
            qs = qs.filter(name__icontains=q)
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = max(1, min(100, int(request.query_params.get("page_size", 20))))
        total = qs.count()
        offset = (page - 1) * page_size
        names = list(qs.values_list("name", flat=True)[offset: offset + page_size])
        return Response({
            "results": names,
            "total": total,
            "page": page,
            "pages": math.ceil(total / page_size) if total else 1,
        })


class ProductViewSet(ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]  # TODO: restringir escrita para admin
    lookup_field = "slug"

    def get_queryset(self):
        queryset = Product.objects.all()
        # Hide zero-stock products unless the store setting allows it
        cfg = StoreSettings.get()
        if not cfg.show_zero_stock_products:
            queryset = queryset.filter(stock__gt=0)
        if not cfg.show_zero_price_products:
            queryset = queryset.filter(price__gt=0)
        active = self.request.query_params.get("active")
        if active in {"1", "true", "True"}:
            queryset = queryset.filter(is_active=True)
        # Platform: comma-separated list support
        platform = self.request.query_params.get("platform")
        if platform:
            platforms = [p.strip() for p in platform.split(",") if p.strip()]
            if len(platforms) == 1:
                queryset = queryset.filter(platform__iexact=platforms[0])
            elif len(platforms) > 1:
                q_obj = Q()
                for p in platforms:
                    q_obj |= Q(platform__iexact=p)
                queryset = queryset.filter(q_obj)
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__iexact=category.strip())
        # Condition: comma-separated list support
        condition = self.request.query_params.get("condition")
        if condition:
            conditions = [c.strip() for c in condition.split(",") if c.strip()]
            if len(conditions) == 1:
                queryset = queryset.filter(condition__iexact=conditions[0])
            elif len(conditions) > 1:
                q_obj = Q()
                for c in conditions:
                    q_obj |= Q(condition__iexact=c)
                queryset = queryset.filter(q_obj)
        # Price range
        price_min = self.request.query_params.get("price_min")
        if price_min:
            try:
                queryset = queryset.filter(price__gte=float(price_min))
            except (ValueError, TypeError):
                pass
        price_max = self.request.query_params.get("price_max")
        if price_max:
            try:
                queryset = queryset.filter(price__lte=float(price_max))
            except (ValueError, TypeError):
                pass
        search = self.request.query_params.get("q")
        if search:
            queryset = queryset.filter(name__icontains=search.strip())
        return queryset

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        # Ordering
        ordering_map = {
            "-id": "-id",
            "price_asc": "price",
            "price_desc": "-price",
            "name": "name",
            "old_price_desc": "-old_price",
        }
        ordering = request.query_params.get("ordering", "-id")
        qs = qs.order_by(ordering_map.get(ordering, "-id"))
        # Pagination
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            per_page = min(100, max(1, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            per_page = 20
        total = qs.count()
        pages = math.ceil(total / per_page) if total else 1
        qs_page = qs[(page - 1) * per_page: page * per_page]
        return Response({
            "total": total,
            "page": page,
            "pages": pages,
            "per_page": per_page,
            "results": ProductSerializer(qs_page, many=True, context={"request": request}).data,
        })


class QuoteProductSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        if len(query) < 2:
            return Response({"results": []})

        try:
            limit = int(request.query_params.get("limit", 8))
        except (TypeError, ValueError):
            limit = 8
        limit = max(1, min(limit, 20))

        queryset = Product.objects.all()
        cfg = StoreSettings.get()
        if not cfg.show_zero_stock_products:
            queryset = queryset.filter(stock__gt=0)
        if not cfg.show_zero_price_products:
            queryset = queryset.filter(price__gt=0)

        queryset = (
            queryset.filter(is_active=True)
            .filter(Q(name__icontains=query) | Q(sku__icontains=query))
            .order_by("name")[:limit]
        )

        data = []
        for product in queryset:
            image_url = ""
            if product.image:
                image_url = request.build_absolute_uri(product.image.url)

            data.append(
                {
                    "external_id": product.external_id or product.id,
                    "name": product.name,
                    "sku": product.sku,
                    "image_url": image_url,
                    "cover_image_url": image_url,
                    "local_image_path": "",
                }
            )
        return Response({"results": data})


class ProductReviewsView(APIView):
    permission_classes = [AllowAny]

    def _has_purchased(self, user, product):
        from apps.core.models import SaleItem, SaleStatus
        return SaleItem.objects.filter(
            sale__status=SaleStatus.FINALIZADA,
            product_id=product.id,
        ).filter(
            Q(sale__user=user) | Q(sale__customer_email__iexact=user.email)
        ).exists()

    def get(self, request, slug):
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return Response({"detail": "Produto não encontrado."}, status=404)

        reviews = Review.objects.filter(product=product).select_related("user")
        breakdown = {str(i): reviews.filter(rating=i).count() for i in range(1, 6)}

        result = {
            "reviews": ReviewSerializer(reviews, many=True).data,
            "total": reviews.count(),
            "average": float(product.rating),
            "breakdown": breakdown,
            "user_review": None,
            "can_review": False,
        }

        if request.user.is_authenticated:
            user_review = reviews.filter(user=request.user).first()
            result["user_review"] = ReviewSerializer(user_review).data if user_review else None
            result["can_review"] = (
                user_review is None and self._has_purchased(request.user, product)
            )

        return Response(result)

    def post(self, request, slug):
        if not request.user.is_authenticated:
            return Response({"detail": "Autenticação necessária."}, status=401)

        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return Response({"detail": "Produto não encontrado."}, status=404)

        if Review.objects.filter(product=product, user=request.user).exists():
            return Response({"detail": "Você já avaliou este produto."}, status=400)

        if not self._has_purchased(request.user, product):
            return Response(
                {"detail": "Apenas quem concluiu a compra pode avaliar este produto."},
                status=403,
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(product=product, user=request.user, verified_purchase=True)
        return Response(ReviewSerializer(review).data, status=201)


class PublicVitrinasListView(APIView):
    """Public endpoint: GET /api/vitrines/ → all active showcases ordered by order."""

    permission_classes = [AllowAny]

    def get(self, request):
        showcases = Showcase.objects.filter(is_active=True).prefetch_related(
            "showcase_items__product"
        )
        result = []
        for s in showcases:
            items = s.showcase_items.filter(product__is_active=True).order_by("order")
            products = [item.product for item in items]
            result.append({
                "id": s.id,
                "name": s.name,
                "slug": s.slug,
                "title": s.title or s.name,
                "subtitle": s.subtitle,
                "order": s.order,
                "products": ProductSerializer(products, many=True, context={"request": request}).data,
            })
        return Response(result)


class ShowcaseProductsView(APIView):
    """Public endpoint: GET /api/vitrines/<slug>/ → ordered products of a showcase."""

    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            showcase = Showcase.objects.prefetch_related(
                "showcase_items__product"
            ).get(slug=slug, is_active=True)
        except Showcase.DoesNotExist:
            return Response({"detail": "Vitrine não encontrada."}, status=404)

        items = showcase.showcase_items.select_related("product").filter(
            product__is_active=True
        ).order_by("order")

        products = [item.product for item in items]
        return Response({
            "id": showcase.id,
            "name": showcase.name,
            "slug": showcase.slug,
            "title": showcase.title or showcase.name,
            "subtitle": showcase.subtitle,
            "order": showcase.order,
            "products": ProductSerializer(products, many=True, context={"request": request}).data,
        })
