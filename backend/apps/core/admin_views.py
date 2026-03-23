"""Views exclusivas do painel administrativo (dono da loja)."""

from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.parsers import MultiPartParser, FormParser
from apps.accounts.models import User, UserType
from apps.accounts.permissions import IsAdminUser
from apps.products.models import (
    Product,
    Category,
    Platform,
    Subplatform,
    Coupon,
    Showcase,
    ShowcaseItem,
    MAX_SHOWCASE_ITEMS,
    StockMovement,
    StockMovementType,
    StoreSettings,
)

from .models import (
    QuoteRequest,
    QuoteRequestItem,
    QuoteStatus,
    Sale,
    SaleItem,
    SaleStatus,
    SalePaymentMethod,
)


# ---------------------------------------------------------------------------
# Stats do dashboard
# ---------------------------------------------------------------------------


class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        thirty_days_ago = today - timedelta(days=29)

        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()
        total_clientes = User.objects.filter(user_type=UserType.CLIENTE).count()
        total_cotacoes = QuoteRequest.objects.count()
        total_vendas = Sale.objects.count()
        cotacoes_recebidas = QuoteRequest.objects.filter(status=QuoteStatus.RECEBIDA).count()
        cotacoes_respondidas = QuoteRequest.objects.filter(status=QuoteStatus.RESPONDIDA).count()
        cotacoes_finalizadas = QuoteRequest.objects.filter(status=QuoteStatus.FINALIZADA).count()

        # ── Dashboard extras ────────────────────────────────────────────────
        # finalized_at may be NULL for older records – fall back to updated_at
        _hoje_filter = Q(finalized_at__date=today) | Q(
            finalized_at__isnull=True, updated_at__date=today
        )
        _mes_filter = Q(finalized_at__date__gte=month_start) | Q(
            finalized_at__isnull=True, updated_at__date__gte=month_start
        )

        vendas_hoje = Sale.objects.filter(
            status=SaleStatus.FINALIZADA,
        ).filter(_hoje_filter).count()

        fat_hoje_raw = (
            Sale.objects.filter(status=SaleStatus.FINALIZADA)
            .filter(_hoje_filter)
            .aggregate(total=Sum("total_amount"))["total"]
        )
        faturamento_hoje = float(fat_hoje_raw or 0)

        fat_mes_raw = (
            Sale.objects.filter(status=SaleStatus.FINALIZADA)
            .filter(_mes_filter)
            .aggregate(total=Sum("total_amount"))["total"]
        )
        faturamento_mes = float(fat_mes_raw or 0)

        cupons_ativos = Coupon.objects.filter(is_active=True).count()

        top_produtos = list(
            SaleItem.objects
            .filter(sale__status=SaleStatus.FINALIZADA)
            .values("product_name")
            .annotate(total_qty=Sum("quantity"))
            .order_by("-total_qty")[:5]
        )

        vendas_30dias_raw = (
            Sale.objects
            .filter(status=SaleStatus.FINALIZADA)
            .filter(
                Q(finalized_at__date__gte=thirty_days_ago) |
                Q(finalized_at__isnull=True, updated_at__date__gte=thirty_days_ago)
            )
            .annotate(day=TruncDate(Coalesce("finalized_at", "updated_at")))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        day_map = {str(r["day"]): r["count"] for r in vendas_30dias_raw}
        vendas_30dias = [
            {
                "date": str(thirty_days_ago + timedelta(days=i)),
                "count": day_map.get(str(thirty_days_ago + timedelta(days=i)), 0),
            }
            for i in range(30)
        ]

        recent_cotacoes = (
            QuoteRequest.objects.prefetch_related("items")
            .order_by("-id")[:5]
            .values("id", "public_id", "full_name", "email", "city", "status", "created_at")
        )

        return Response(
            {
                "products": {
                    "total": total_products,
                    "active": active_products,
                    "inactive": total_products - active_products,
                },
                "clientes": {"total": total_clientes},
                "cotacoes": {
                    "total": total_cotacoes,
                    "recebidas": cotacoes_recebidas,
                    "respondidas": cotacoes_respondidas,
                    "finalizadas": cotacoes_finalizadas,
                },
                "vendas": {
                    "total": total_vendas,
                    "pendentes": Sale.objects.filter(status=SaleStatus.PENDENTE).count(),
                    "em_andamento": Sale.objects.filter(status=SaleStatus.EM_ANDAMENTO).count(),
                    "finalizadas": Sale.objects.filter(status=SaleStatus.FINALIZADA).count(),
                },
                "vendas_hoje": vendas_hoje,
                "faturamento_hoje": faturamento_hoje,
                "faturamento_mes": faturamento_mes,
                "cupons_ativos": cupons_ativos,
                "top_produtos": top_produtos,
                "vendas_30dias": vendas_30dias,
                "recent_cotacoes": list(recent_cotacoes),
            }
        )


# ---------------------------------------------------------------------------
# Cotações
# ---------------------------------------------------------------------------


class AdminCotacoesListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = QuoteRequest.objects.prefetch_related("items").order_by("-id")

        # Filtros opcionais
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(full_name__icontains=q) | qs.filter(email__icontains=q)

        status_filter = (request.query_params.get("status") or "").strip()
        if status_filter in {QuoteStatus.RECEBIDA, QuoteStatus.RESPONDIDA, QuoteStatus.FINALIZADA}:
            qs = qs.filter(status=status_filter)

        page = max(1, int(request.query_params.get("page") or 1))
        per_page = 20
        total = qs.count()
        qs = qs[(page - 1) * per_page : page * per_page]

        results = []
        for quote in qs:
            items_count = quote.items.count()
            results.append(
                {
                    "id": quote.id,
                    "protocol": str(quote.public_id),
                    "full_name": quote.full_name,
                    "email": quote.email,
                    "phone": quote.phone,
                    "city": quote.city,
                    "source": quote.source,
                    "status": quote.status,
                    "admin_responded_at": quote.admin_responded_at,
                    "items_count": items_count,
                    "created_at": quote.created_at,
                }
            )

        return Response(
            {
                "total": total,
                "page": page,
                "per_page": per_page,
                "results": results,
            }
        )


# ---------------------------------------------------------------------------
# Categorias
# ---------------------------------------------------------------------------


class AdminCategoriasListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.serializers import CategorySerializer
        q = (request.query_params.get("q") or "").strip()
        qs = Category.objects.all()
        if q:
            qs = qs.filter(name__icontains=q)
        total = qs.count()
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = max(1, min(200, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20
        offset = (page - 1) * page_size
        import math
        pages = math.ceil(total / page_size) if total else 1
        qs_page = qs[offset: offset + page_size]
        return Response({"results": CategorySerializer(qs_page, many=True).data, "total": total, "page": page, "page_size": page_size, "pages": pages})

    def post(self, request):
        from apps.products.serializers import CategorySerializer
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminCategoriaDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        try:
            return Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return None

    def patch(self, request, pk):
        from apps.products.serializers import CategorySerializer
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        serializer = CategorySerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        obj.delete()
        return Response(status=204)


# ---------------------------------------------------------------------------
# Plataformas
# ---------------------------------------------------------------------------


class AdminPlataformasListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.serializers import PlatformSerializer
        q = (request.query_params.get("q") or "").strip()
        qs = Platform.objects.all()
        if q:
            qs = qs.filter(name__icontains=q)
        total = qs.count()
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = max(1, min(200, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20
        offset = (page - 1) * page_size
        import math
        pages = math.ceil(total / page_size) if total else 1
        qs_page = qs[offset: offset + page_size]
        return Response({"results": PlatformSerializer(qs_page, many=True).data, "total": total, "page": page, "page_size": page_size, "pages": pages})

    def post(self, request):
        from apps.products.serializers import PlatformSerializer
        serializer = PlatformSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminPlataformaDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        try:
            return Platform.objects.get(pk=pk)
        except Platform.DoesNotExist:
            return None

    def patch(self, request, pk):
        from apps.products.serializers import PlatformSerializer
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        serializer = PlatformSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        obj.delete()
        return Response(status=204)


# ---------------------------------------------------------------------------
# Subplataformas
# ---------------------------------------------------------------------------


class AdminSubplataformasListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.serializers import SubplatformSerializer
        q = (request.query_params.get("q") or "").strip()
        platform = (request.query_params.get("platform") or "").strip()
        qs = Subplatform.objects.select_related("platform").all()
        if q:
            qs = qs.filter(name__icontains=q)
        if platform:
            qs = qs.filter(platform__name__iexact=platform)
        total = qs.count()
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = max(1, min(200, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20
        offset = (page - 1) * page_size
        import math
        pages = math.ceil(total / page_size) if total else 1
        qs_page = qs[offset: offset + page_size]
        return Response({"results": SubplatformSerializer(qs_page, many=True).data, "total": total, "page": page, "page_size": page_size, "pages": pages})

    def post(self, request):
        from apps.products.serializers import SubplatformSerializer
        serializer = SubplatformSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminSubplataformaDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        try:
            return Subplatform.objects.select_related("platform").get(pk=pk)
        except Subplatform.DoesNotExist:
            return None

    def patch(self, request, pk):
        from apps.products.serializers import SubplatformSerializer
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        serializer = SubplatformSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        obj.delete()
        return Response(status=204)


# ---------------------------------------------------------------------------
# Cupons
# ---------------------------------------------------------------------------


class AdminCuponsListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.serializers import CouponSerializer

        q = (request.query_params.get("q") or "").strip()
        qs = Coupon.objects.all()
        if q:
            qs = qs.filter(code__icontains=q)

        active = request.query_params.get("active")
        if active in {"1", "true"}:
            qs = qs.filter(is_active=True)
        elif active in {"0", "false"}:
            qs = qs.filter(is_active=False)

        return Response(
            {
                "results": CouponSerializer(qs, many=True).data,
                "total": qs.count(),
            }
        )

    def post(self, request):
        from apps.products.serializers import CouponSerializer

        serializer = CouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminCupomDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        try:
            return Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return None

    def patch(self, request, pk):
        from apps.products.serializers import CouponSerializer

        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        serializer = CouponSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        obj.delete()
        return Response(status=204)


# ---------------------------------------------------------------------------
# Vendas
# ---------------------------------------------------------------------------


class AdminVendasListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        qs = Sale.objects.prefetch_related("items").all().order_by("-id")
        if q:
            qs = qs.filter(customer_name__icontains=q) | qs.filter(customer_email__icontains=q)
        if status_filter in {
            SaleStatus.PENDENTE,
            SaleStatus.EM_ANDAMENTO,
            SaleStatus.FINALIZADA,
            SaleStatus.CANCELADA,
        }:
            qs = qs.filter(status=status_filter)

        page = max(1, int(request.query_params.get("page") or 1))
        per_page = 20
        total = qs.count()
        qs = qs[(page - 1) * per_page : page * per_page]

        results = [
            {
                "id": obj.id,
                "protocol": str(obj.public_id),
                "customer_name": obj.customer_name,
                "customer_email": obj.customer_email,
                "customer_phone": obj.customer_phone,
                "status": obj.status,
                "payment_method": obj.payment_method,
                "items_count": obj.items.count(),
                "total_amount": str(obj.total_amount),
                "coupon_code": obj.coupon_code,
                "discount_amount": str(obj.discount_amount),
                "created_at": obj.created_at,
                "finalized_at": obj.finalized_at,
            }
            for obj in qs
        ]

        return Response(
            {
                "total": total,
                "page": page,
                "per_page": per_page,
                "results": results,
            }
        )


class AdminVendaDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        try:
            return Sale.objects.prefetch_related("items").get(pk=pk)
        except Sale.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Venda não encontrada."}, status=404)

        return Response(
            {
                "id": obj.id,
                "protocol": str(obj.public_id),
                "customer_name": obj.customer_name,
                "customer_email": obj.customer_email,
                "customer_phone": obj.customer_phone,
                "customer_city": obj.customer_city,
                "customer_state": obj.customer_state,
                "status": obj.status,
                "payment_method": obj.payment_method,
                "coupon_code": obj.coupon_code,
                "discount_amount": str(obj.discount_amount),
                "total_amount": str(obj.total_amount),
                "admin_notes": obj.admin_notes,
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
                "finalized_at": obj.finalized_at,
                "items": [
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "product_name": item.product_name,
                        "platform": item.platform,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price),
                        "total_price": str(item.total_price),
                    }
                    for item in obj.items.all()
                ],
            }
        )

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Venda não encontrada."}, status=404)

        data = request.data or {}
        next_status = (data.get("status") or "").strip()
        payment_method = (data.get("payment_method") or "").strip()
        admin_notes = data.get("admin_notes")

        if next_status:
            valid_statuses = {
                SaleStatus.PENDENTE,
                SaleStatus.EM_ANDAMENTO,
                SaleStatus.FINALIZADA,
                SaleStatus.CANCELADA,
            }
            if next_status not in valid_statuses:
                return Response({"detail": f"Status inválido: '{next_status}'."}, status=400)

            prev_status = obj.status
            obj.status = next_status

            if next_status == SaleStatus.FINALIZADA and not obj.finalized_at:
                obj.finalized_at = timezone.now()

            # ----------------------------------------------------------------
            # Registrar saídas no extrato quando venda é finalizada
            # ----------------------------------------------------------------
            if next_status == SaleStatus.FINALIZADA and prev_status != SaleStatus.FINALIZADA:
                for item in obj.items.all():
                    if not item.product_id:
                        continue
                    try:
                        product = Product.objects.get(pk=item.product_id)
                    except Product.DoesNotExist:
                        continue
                    qty = item.quantity
                    stock_before = product.stock
                    new_stock = max(0, stock_before - qty)
                    product.stock = new_stock
                    product.in_stock = new_stock > 0
                    product.save(update_fields=["stock", "in_stock"])
                    StockMovement.objects.create(
                        product=product,
                        movement_type="saida",
                        quantity=qty,
                        reason="venda",
                        reference=f"Venda #{obj.id} – {str(obj.public_id)[:8]}",
                        notes="",
                        stock_before=stock_before,
                        stock_after=new_stock,
                    )

        if payment_method:
            valid_methods = {choice[0] for choice in SalePaymentMethod.choices}
            if payment_method not in valid_methods:
                return Response(
                    {"detail": f"Meio de pagamento inválido: '{payment_method}'."},
                    status=400,
                )
            obj.payment_method = payment_method

        if admin_notes is not None:
            obj.admin_notes = str(admin_notes)

        obj.save()
        return self.get(request, pk)


def _recalculate_sale_total(sale):
    """Recalculate sale.total_amount from its items minus discount_amount."""
    from decimal import Decimal
    items_total = sum(item.total_price for item in sale.items.all())
    sale.total_amount = max(Decimal("0"), items_total - sale.discount_amount)
    sale.save(update_fields=["total_amount"])


class AdminVendaItemsView(APIView):
    """POST – add a new item to a sale; returns updated sale detail."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            sale = Sale.objects.prefetch_related("items").get(pk=pk)
        except Sale.DoesNotExist:
            return Response({"detail": "Venda não encontrada."}, status=404)

        data = request.data or {}
        product_name = (data.get("product_name") or "").strip()
        if not product_name:
            return Response({"detail": "product_name é obrigatório."}, status=400)

        try:
            quantity = max(1, int(data.get("quantity") or 1))
        except (ValueError, TypeError):
            return Response({"detail": "quantity inválida."}, status=400)

        try:
            from decimal import Decimal, InvalidOperation
            unit_price = Decimal(str(data.get("unit_price") or "0"))
        except InvalidOperation:
            return Response({"detail": "unit_price inválido."}, status=400)

        total_price = unit_price * quantity
        platform = (data.get("platform") or "").strip()
        product_id = data.get("product_id") or None

        from .models import SaleItem
        SaleItem.objects.create(
            sale=sale,
            product_id=product_id,
            product_name=product_name,
            platform=platform,
            quantity=quantity,
            unit_price=unit_price,
            total_price=total_price,
        )
        _recalculate_sale_total(sale)
        sale.refresh_from_db()
        return AdminVendaDetailView().get(request, pk)


class AdminVendaItemDetailView(APIView):
    """PATCH / DELETE a single SaleItem."""

    permission_classes = [IsAdminUser]

    def _get(self, sale_pk, item_pk):
        from .models import SaleItem
        try:
            return SaleItem.objects.select_related("sale").get(pk=item_pk, sale_id=sale_pk)
        except SaleItem.DoesNotExist:
            return None

    def patch(self, request, pk, item_pk):
        item = self._get(pk, item_pk)
        if not item:
            return Response({"detail": "Item não encontrado."}, status=404)

        data = request.data or {}
        from decimal import Decimal, InvalidOperation

        if "product_id" in data:
            item.product_id = data["product_id"]  # can be None

        if "product_name" in data:
            product_name = (data["product_name"] or "").strip()
            if not product_name:
                return Response({"detail": "product_name não pode ser vazio."}, status=400)
            item.product_name = product_name

        if "quantity" in data:
            try:
                quantity = max(1, int(data["quantity"]))
            except (ValueError, TypeError):
                return Response({"detail": "quantity inválida."}, status=400)
            item.quantity = quantity

        if "unit_price" in data:
            try:
                item.unit_price = Decimal(str(data["unit_price"]))
            except InvalidOperation:
                return Response({"detail": "unit_price inválido."}, status=400)

        item.total_price = item.unit_price * item.quantity
        item.save()

        sale = Sale.objects.prefetch_related("items").get(pk=pk)
        _recalculate_sale_total(sale)
        sale.refresh_from_db()
        return AdminVendaDetailView().get(request, pk)

    def delete(self, request, pk, item_pk):
        item = self._get(pk, item_pk)
        if not item:
            return Response({"detail": "Item não encontrado."}, status=404)
        item.delete()
        sale = Sale.objects.prefetch_related("items").get(pk=pk)
        _recalculate_sale_total(sale)
        sale.refresh_from_db()
        return AdminVendaDetailView().get(request, pk)


class AdminCotacaoDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            quote = QuoteRequest.objects.prefetch_related("items__photos").get(pk=pk)
        except QuoteRequest.DoesNotExist:
            return Response({"detail": "Cotação não encontrada."}, status=404)

        items = []
        for item in quote.items.all():
            photos = [
                {
                    "id": p.id,
                    "url": request.build_absolute_uri(p.image.url) if p.image else None,
                    "original_name": p.original_name,
                }
                for p in item.photos.all()
            ]
            items.append(
                {
                    "id": item.id,
                    "product_name": item.product_name,
                    "sku": item.sku,
                    "quantity": item.quantity,
                    "quality_level": item.quality_level,
                    "quality_label": item.quality_label,
                    "mode": item.mode,
                    "comment": item.comment,
                    "photos": photos,
                    "admin_price_offer": str(item.admin_price_offer) if item.admin_price_offer is not None else None,
                    "admin_store_credit": str(item.admin_store_credit) if item.admin_store_credit is not None else None,
                    "admin_conditions": item.admin_conditions,
                }
            )

        return Response(
            {
                "id": quote.id,
                "protocol": str(quote.public_id),
                "full_name": quote.full_name,
                "email": quote.email,
                "phone": quote.phone,
                "city": quote.city,
                "source": quote.source,
                "status": quote.status,
                "admin_responded_at": quote.admin_responded_at,
                "admin_notes": quote.admin_notes,
                "created_at": quote.created_at,
                "items": items,
            }
        )

    def patch(self, request, pk):
        """Responder cotação por item ou alterar status."""
        try:
            quote = QuoteRequest.objects.prefetch_related("items").get(pk=pk)
        except QuoteRequest.DoesNotExist:
            return Response({"detail": "Cotação não encontrada."}, status=404)

        new_status = (request.data.get("status") or "").strip()
        valid_statuses = {QuoteStatus.RECEBIDA, QuoteStatus.RESPONDIDA, QuoteStatus.FINALIZADA}

        # Atualizar campos por item
        items_data = request.data.get("items") or []
        item_map = {item.id: item for item in quote.items.all()}
        any_item_responded = False

        # Observação geral da cotação
        if "admin_notes" in request.data:
            quote.admin_notes = str(request.data["admin_notes"] or "")

        for item_payload in items_data:
            item_id = item_payload.get("id")
            item = item_map.get(item_id)
            if not item:
                continue

            if "admin_price_offer" in item_payload:
                val = item_payload["admin_price_offer"]
                item.admin_price_offer = val if val not in (None, "") else None
            if "admin_store_credit" in item_payload:
                val = item_payload["admin_store_credit"]
                item.admin_store_credit = val if val not in (None, "") else None
            if "admin_conditions" in item_payload:
                item.admin_conditions = str(item_payload["admin_conditions"] or "")

            if item.admin_price_offer is not None or item.admin_store_credit is not None:
                any_item_responded = True

            item.save()

        # Transição de status
        if new_status and new_status in valid_statuses:
            if new_status == QuoteStatus.RESPONDIDA and quote.status == QuoteStatus.RECEBIDA:
                quote.admin_responded_at = timezone.now()
            quote.status = new_status
        elif new_status and new_status not in valid_statuses:
            return Response({"detail": f"Status inválido: '{new_status}'."}, status=400)
        elif any_item_responded and quote.status == QuoteStatus.RECEBIDA:
            # Transição automática ao salvar a primeira resposta
            quote.status = QuoteStatus.RESPONDIDA
            quote.admin_responded_at = timezone.now()

        quote.save()

        # Retornar quote completa atualizada
        updated_items = []
        for item in quote.items.all():
            updated_items.append(
                {
                    "id": item.id,
                    "product_name": item.product_name,
                    "sku": item.sku,
                    "quantity": item.quantity,
                    "quality_level": item.quality_level,
                    "quality_label": item.quality_label,
                    "mode": item.mode,
                    "comment": item.comment,
                    "photos": [],
                    "admin_price_offer": str(item.admin_price_offer) if item.admin_price_offer is not None else None,
                    "admin_store_credit": str(item.admin_store_credit) if item.admin_store_credit is not None else None,
                    "admin_conditions": item.admin_conditions,
                }
            )

        return Response(
            {
                "id": quote.id,
                "status": quote.status,
                "admin_responded_at": quote.admin_responded_at,
                "admin_notes": quote.admin_notes,
                "items": updated_items,
            }
        )
# ---------------------------------------------------------------------------
# Produtos
# ---------------------------------------------------------------------------


class AdminProdutosListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.serializers import ProductSerializer

        qs = Product.objects.all().order_by("-id")

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)

        sku = (request.query_params.get("sku") or "").strip()
        if sku:
            qs = qs.filter(sku__icontains=sku)

        platform = (request.query_params.get("platform") or "").strip()
        if platform:
            qs = qs.filter(platform__iexact=platform)

        category = (request.query_params.get("category") or "").strip()
        if category:
            qs = qs.filter(category__iexact=category)

        active = request.query_params.get("active")
        if active in {"1", "true"}:
            qs = qs.filter(is_active=True)
        elif active in {"0", "false"}:
            qs = qs.filter(is_active=False)

        page = max(1, int(request.query_params.get("page") or 1))
        per_page = 20
        total = qs.count()
        qs = qs[(page - 1) * per_page : page * per_page]

        return Response(
            {
                "total": total,
                "page": page,
                "per_page": per_page,
                "results": ProductSerializer(qs, many=True, context={"request": request}).data,
            }
        )

    def post(self, request):
        from apps.products.serializers import ProductSerializer

        data = request.data.copy()

        # Auto-gera slug único a partir do nome se não informado
        if not data.get("slug") and data.get("name"):
            base = slugify(data["name"])
            candidate = base
            counter = 1
            while Product.objects.filter(slug=candidate).exists():
                candidate = f"{base}-{counter}"
                counter += 1
            data["slug"] = candidate

        serializer = ProductSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch_product(self, request, pk):
        from apps.products.serializers import ProductSerializer

        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"detail": "Produto não encontrado."}, status=404)

        serializer = ProductSerializer(product, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminProdutoDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from apps.products.serializers import ProductSerializer

        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"detail": "Produto não encontrado."}, status=404)
        return Response(ProductSerializer(product, context={"request": request}).data)

    def patch(self, request, pk):
        from apps.products.serializers import ProductSerializer

        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"detail": "Produto não encontrado."}, status=404)

        serializer = ProductSerializer(product, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"detail": "Produto não encontrado."}, status=404)
        product.delete()
        return Response(status=204)


# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------


class AdminClientesListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = User.objects.filter(user_type=UserType.CLIENTE).order_by("-id")

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(full_name__icontains=q) | qs.filter(email__icontains=q)

        page = max(1, int(request.query_params.get("page") or 1))
        per_page = 20
        total = qs.count()
        qs = qs[(page - 1) * per_page : page * per_page]

        results = [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "phone": u.phone,
                "address_city": u.address_city,
                "address_state": u.address_state,
                "date_joined": u.date_joined,
                "cpf": u.cpf,
            }
            for u in qs
        ]

        return Response(
            {
                "total": total,
                "page": page,
                "per_page": per_page,
                "results": results,
            }
        )


# ---------------------------------------------------------------------------
# Vitrines
# ---------------------------------------------------------------------------


class AdminVitrinasListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.serializers import ShowcaseSerializer
        showcases = Showcase.objects.all()
        return Response(ShowcaseSerializer(showcases, many=True).data)

    def post(self, request):
        from apps.products.serializers import ShowcaseSerializer
        from django.utils.text import slugify
        data = request.data.copy()
        # Auto-generate slug from name if not provided
        if not data.get("slug") and data.get("name"):
            base = slugify(data["name"])
            candidate = base
            counter = 1
            while Showcase.objects.filter(slug=candidate).exists():
                candidate = f"{base}-{counter}"
                counter += 1
            data["slug"] = candidate
        serializer = ShowcaseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminVitrinaDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        try:
            return Showcase.objects.prefetch_related("showcase_items__product").get(pk=pk)
        except Showcase.DoesNotExist:
            return None

    def get(self, request, pk):
        from apps.products.serializers import ShowcaseDetailSerializer
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "N\u00e3o encontrado."}, status=404)
        return Response(ShowcaseDetailSerializer(obj, context={"request": request}).data)

    def patch(self, request, pk):
        from apps.products.serializers import ShowcaseSerializer
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        serializer = ShowcaseSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"detail": "Não encontrado."}, status=404)
        obj.delete()
        return Response(status=204)


class AdminVitrinaItemsView(APIView):
    """Adiciona ou reordena produtos em uma vitrine."""
    permission_classes = [IsAdminUser]

    def _get_showcase(self, pk):
        try:
            return Showcase.objects.get(pk=pk)
        except Showcase.DoesNotExist:
            return None

    def post(self, request, pk):
        """Adiciona um produto (body: {product_id, order?})"""
        from apps.products.serializers import ShowcaseItemSerializer
        showcase = self._get_showcase(pk)
        if not showcase:
            return Response({"detail": "Vitrine n\u00e3o encontrada."}, status=404)
        serializer = ShowcaseItemSerializer(
            data=request.data,
            context={"showcase": showcase, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(showcase=showcase)
        # Retorna a vitrine completa atualizada
        from apps.products.serializers import ShowcaseDetailSerializer
        return Response(
            ShowcaseDetailSerializer(
                Showcase.objects.prefetch_related("showcase_items__product").get(pk=pk),
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class AdminVitrinaItemDetailView(APIView):
    """Remove ou reordena um item espec\u00edfico."""
    permission_classes = [IsAdminUser]

    def _get(self, showcase_pk, item_pk):
        try:
            return ShowcaseItem.objects.get(pk=item_pk, showcase_id=showcase_pk)
        except ShowcaseItem.DoesNotExist:
            return None

    def patch(self, request, pk, item_pk):
        item = self._get(pk, item_pk)
        if not item:
            return Response({"detail": "Item n\u00e3o encontrado."}, status=404)
        order = request.data.get("order")
        if order is not None:
            item.order = int(order)
            item.save(update_fields=["order"])
        from apps.products.serializers import ShowcaseDetailSerializer
        return Response(
            ShowcaseDetailSerializer(
                Showcase.objects.prefetch_related("showcase_items__product").get(pk=pk),
                context={"request": request},
            ).data
        )

    def delete(self, request, pk, item_pk):
        item = self._get(pk, item_pk)
        if not item:
            return Response({"detail": "Item n\u00e3o encontrado."}, status=404)
        item.delete()
        from apps.products.serializers import ShowcaseDetailSerializer
        return Response(
            ShowcaseDetailSerializer(
                Showcase.objects.prefetch_related("showcase_items__product").get(pk=pk),
                context={"request": request},
            ).data
        )


class AdminProdutosSearchView(APIView):
    """Busca r\u00e1pida de produtos para o seletor da vitrine."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response([])
        from apps.products.serializers import ShowcaseItemProductSerializer
        qs = Product.objects.filter(name__icontains=q, is_active=True)[:20]
        return Response(ShowcaseItemProductSerializer(qs, many=True, context={"request": request}).data)


class AdminProdutoImagensView(APIView):
    """Upload multipart de imagens de capa e gal\u00e9ria de um produto."""
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        from django.core.files.storage import default_storage
        from apps.products.serializers import ProductSerializer

        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"detail": "Produto n\u00e3o encontrado."}, status=404)

        try:
            # Imagem de capa
            if "image" in request.FILES:
                if product.image:
                    try:
                        product.image.delete(save=False)
                    except Exception:
                        pass
                product.image = request.FILES["image"]

            # Imagens de galeria (gallery_1 .. gallery_3)
            new_gallery = []
            for i in range(1, 4):
                f = request.FILES.get(f"gallery_{i}")
                if f:
                    saved_path = default_storage.save(f"products/{f.name}", f)
                    url = default_storage.url(saved_path)
                    new_gallery.append(url)

            if new_gallery:
                product.gallery_images = new_gallery

            product.save()
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": f"Erro ao salvar imagem: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(ProductSerializer(product, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Extrato de estoque
# ---------------------------------------------------------------------------


class AdminExtratoView(APIView):
    """Lista movimentações e permite criar uma nova entrada/saída manual."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = StockMovement.objects.select_related("product").order_by("-created_at")

        # Filters
        movement_type = request.query_params.get("type")
        if movement_type in ("entrada", "saida"):
            qs = qs.filter(movement_type=movement_type)

        product_id = request.query_params.get("product_id")
        if product_id:
            qs = qs.filter(product_id=product_id)

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(product__name__icontains=q)

        date_from = request.query_params.get("date_from", "").strip()
        date_to = request.query_params.get("date_to", "").strip()
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        # Pagination
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except ValueError:
            page = 1
        per_page = 50
        total = qs.count()
        start = (page - 1) * per_page
        items = qs[start : start + per_page]

        data = []
        for m in items:
            data.append(
                {
                    "id": m.id,
                    "movement_type": m.movement_type,
                    "product_id": m.product_id,
                    "product_name": m.product.name,
                    "product_sku": m.product.sku,
                    "quantity": m.quantity,
                    "reason": m.reason,
                    "reference": m.reference,
                    "notes": m.notes,
                    "stock_before": m.stock_before,
                    "stock_after": m.stock_after,
                    "created_at": m.created_at.isoformat(),
                }
            )

        return Response(
            {
                "count": total,
                "page": page,
                "per_page": per_page,
                "results": data,
            }
        )

    def post(self, request):
        product_id = request.data.get("product_id")
        movement_type = request.data.get("movement_type")
        try:
            quantity = int(request.data.get("quantity", 0))
        except (TypeError, ValueError):
            quantity = 0

        reason = request.data.get("reason", "").strip()
        reference = request.data.get("reference", "").strip()
        notes = request.data.get("notes", "").strip()

        if not product_id:
            return Response({"detail": "product_id é obrigatório."}, status=400)
        if movement_type not in ("entrada", "saida"):
            return Response({"detail": "movement_type deve ser 'entrada' ou 'saida'."}, status=400)
        if quantity <= 0:
            return Response({"detail": "Quantidade deve ser maior que zero."}, status=400)

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({"detail": "Produto não encontrado."}, status=404)

        stock_before = product.stock
        if movement_type == "entrada":
            new_stock = stock_before + quantity
        else:
            new_stock = max(0, stock_before - quantity)

        product.stock = new_stock
        product.in_stock = new_stock > 0
        product.save(update_fields=["stock", "in_stock"])

        movement = StockMovement.objects.create(
            product=product,
            movement_type=movement_type,
            quantity=quantity,
            reason=reason,
            reference=reference,
            notes=notes,
            stock_before=stock_before,
            stock_after=new_stock,
        )

        return Response(
            {
                "id": movement.id,
                "movement_type": movement.movement_type,
                "product_id": movement.product_id,
                "product_name": product.name,
                "product_sku": product.sku,
                "quantity": movement.quantity,
                "reason": movement.reason,
                "reference": movement.reference,
                "notes": movement.notes,
                "stock_before": movement.stock_before,
                "stock_after": movement.stock_after,
                "created_at": movement.created_at.isoformat(),
            },
            status=201,
        )


# ---------------------------------------------------------------------------
# Configurações da loja
# ---------------------------------------------------------------------------


class AdminStoreSettingsView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        cfg = StoreSettings.get()
        return Response(self._serialize(cfg, request))

    def patch(self, request):
        cfg = StoreSettings.get()
        data = request.data or {}

        if "store_name" in data:
            name = str(data["store_name"]).strip()
            if name:
                cfg.store_name = name

        if "logo" in request.FILES:
            cfg.logo = request.FILES["logo"]

        if "allow_zero_stock_sale" in data:
            cfg.allow_zero_stock_sale = str(data["allow_zero_stock_sale"]).lower() in ("true", "1")
        if "show_zero_stock_products" in data:
            cfg.show_zero_stock_products = str(data["show_zero_stock_products"]).lower() in ("true", "1")
        if "show_zero_price_products" in data:
            cfg.show_zero_price_products = str(data["show_zero_price_products"]).lower() in ("true", "1")

        cfg.save()
        return Response(self._serialize(cfg, request))

    def _serialize(self, cfg, request=None):
        logo_url = None
        if cfg.logo:
            logo_url = request.build_absolute_uri(cfg.logo.url) if request else cfg.logo.url
        return {
            "store_name": cfg.store_name,
            "logo_url": logo_url,
            "allow_zero_stock_sale": cfg.allow_zero_stock_sale,
            "show_zero_stock_products": cfg.show_zero_stock_products,
            "show_zero_price_products": cfg.show_zero_price_products,
            "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None,
        }


# ---------------------------------------------------------------------------
# Alterar senha do admin logado
# ---------------------------------------------------------------------------


class AdminChangePasswordView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        data = request.data or {}
        current_password = (data.get("current_password") or "").strip()
        new_password = (data.get("new_password") or "").strip()
        confirm_password = (data.get("confirm_password") or "").strip()

        if not current_password or not new_password or not confirm_password:
            return Response({"detail": "Todos os campos s\u00e3o obrigat\u00f3rios."}, status=400)

        if new_password != confirm_password:
            return Response({"detail": "As senhas n\u00e3o coincidem."}, status=400)

        if len(new_password) < 6:
            return Response({"detail": "A nova senha deve ter pelo menos 6 caracteres."}, status=400)

        user = request.user
        if not user.check_password(current_password):
            return Response({"detail": "Senha atual incorreta."}, status=400)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        # Re-authenticate session so user isn't logged out
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, user)

        return Response({"detail": "Senha alterada com sucesso."})
