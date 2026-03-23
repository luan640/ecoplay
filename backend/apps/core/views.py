import uuid
import json
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import QuoteRequest, QuoteRequestItem, QuoteRequestItemPhoto, Sale, SaleItem
from apps.products.models import StoreSettings


@api_view(["GET"])
def healthcheck(request):
    return Response(
        {
            "status": "ok",
            "service": "game-store-api",
            "message": "API Django operando normalmente.",
        }
    )


class AsaasCheckoutCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        def normalize_name(raw_name: str, raw_email: str) -> str:
            name = " ".join(str(raw_name or "").strip().split())
            if not name:
                email_prefix = str(raw_email or "").split("@")[0].replace(".", " ").replace("_", " ").strip()
                name = " ".join(email_prefix.split())
            if not name:
                name = "Cliente Checkout"
            if " " not in name:
                name = f"{name} Cliente"
            return name[:80]

        access_token = getattr(settings, "ACESS_TOKEN_ASAAS_DEV", None) or getattr(
            settings, "ACCESS_TOKEN_ASAAS_DEV", None
        ) or ""
        if not access_token:
            return Response(
                {"detail": "Token do Asaas não configurado no backend."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        items = request.data.get("items") or []
        if not isinstance(items, list) or not items:
            return Response(
                {"detail": "Envie ao menos um item para criar o checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        billing_type = (request.data.get("billingType") or "PIX").upper()
        if billing_type not in {"PIX", "CREDIT_CARD"}:
            billing_type = "PIX"

        callback_base_url = (
            getattr(settings, "ASAAS_CALLBACK_BASE_URL", None)
            or getattr(settings, "FRONTEND_URL", "https://example.com")
        ).rstrip("/")

        payload_items = []
        for item in items:
            quantity = int(item.get("quantity") or 1)
            value = float(item.get("value") or item.get("price") or 0)
            if quantity <= 0 or value <= 0:
                continue
            payload_items.append(
                {
                    "externalReference": str(item.get("externalReference") or item.get("id") or uuid.uuid4()),
                    "description": str(item.get("description") or item.get("name") or "Item do pedido"),
                    "name": str(item.get("name") or "Produto"),
                    "value": value,
                    "quantity": quantity,
                }
            )

        if not payload_items:
            return Response(
                {"detail": "Nenhum item válido para envio ao Asaas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        charge_types = ["DETACHED"]
        if billing_type == "CREDIT_CARD":
            charge_types.append("INSTALLMENT")

        payload = {
            "billingTypes": [billing_type],
            "chargeTypes": charge_types,
            "items": payload_items,
        }
        if billing_type == "CREDIT_CARD":
            payload["installment"] = {
                "maxInstallmentCount": 10,
            }

        incoming_customer_data = request.data.get("customerData") or {}
        if not isinstance(incoming_customer_data, dict):
            incoming_customer_data = {}

        default_customer_data = {
            "name": "Cliente Teste",
            "cpfCnpj": "12345678909",
            "email": "cliente.teste@example.com",
            "phone": "11999998888",
            "postalCode": "60337120",
            "address": "Rua Walter Pompeu",
            "addressNumber": "123",
            "complement": "",
            "province": "Álvaro Weyne",
            "city": 2304400,
        }
        customer_data = {**default_customer_data, **incoming_customer_data}

        city_code = customer_data.get("city")
        try:
            city_code = int(city_code) if city_code is not None else default_customer_data["city"]
        except (ValueError, TypeError):
            city_code = default_customer_data["city"]

        payload["customerData"] = {
            "name": normalize_name(
                customer_data.get("name") or default_customer_data["name"],
                customer_data.get("email") or default_customer_data["email"],
            ),
            "cpfCnpj": str(customer_data.get("cpfCnpj") or default_customer_data["cpfCnpj"]).strip(),
            "email": str(customer_data.get("email") or default_customer_data["email"]).strip(),
            "phone": str(customer_data.get("phone") or default_customer_data["phone"]).strip(),
            "postalCode": str(customer_data.get("postalCode") or default_customer_data["postalCode"]).replace("-", "").strip(),
            "address": str(customer_data.get("address") or default_customer_data["address"]).strip(),
            "addressNumber": str(customer_data.get("addressNumber") or default_customer_data["addressNumber"]).strip(),
            "complement": str(customer_data.get("complement") or "").strip(),
            "province": str(customer_data.get("province") or default_customer_data["province"]).strip(),
            "city": city_code,
        }

        payload["callback"] = {
            "successUrl": f"{callback_base_url}/asaas/checkout/success",
            "cancelUrl": f"{callback_base_url}/asaas/checkout/cancel",
            "expiredUrl": f"{callback_base_url}/asaas/checkout/expired",
        }

        try:
            response = requests.post(
                "https://api-sandbox.asaas.com/v3/checkouts",
                json=payload,
                headers={
                    "accept": "application/json",
                    "content-type": "application/json",
                    "access_token": access_token,
                },
                timeout=20,
            )
            data = response.json()
        except requests.RequestException as exc:
            return Response(
                {"detail": "Falha de conexão com Asaas.", "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError:
            return Response(
                {"detail": "Resposta inválida do Asaas.", "raw": response.text},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        checkout_url = (
            data.get("url")
            or data.get("link")
            or data.get("checkoutUrl")
            or data.get("invoiceUrl")
            or (data.get("checkout") or {}).get("url")
            or (data.get("checkout") or {}).get("link")
        )

        return Response(
            {
                "success": response.ok,
                "status_code": response.status_code,
                "asaas": data,
                "checkout_url": checkout_url,
            },
            status=response.status_code if response.status_code else 500,
        )


class QuoteSubmitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        full_name = str(request.data.get("full_name") or "").strip()
        email = str(request.data.get("email") or "").strip()
        phone = str(request.data.get("phone") or "").strip()
        city = str(request.data.get("city") or "").strip()
        source = str(request.data.get("source") or "").strip()

        if not full_name or not email:
            return Response(
                {"detail": "Nome e e-mail sao obrigatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_basket = request.data.get("basket")
        if raw_basket is None:
            return Response(
                {"detail": "Basket nao informado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            basket = json.loads(raw_basket) if isinstance(raw_basket, str) else raw_basket
        except (TypeError, ValueError):
            return Response(
                {"detail": "Basket invalido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(basket, list) or not basket:
            return Response(
                {"detail": "Adicione ao menos um item na cesta da cotacao."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            quote = QuoteRequest.objects.create(
                user=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
                full_name=full_name,
                email=email,
                phone=phone,
                city=city,
                source=source,
            )

            created_items = 0
            created_photos = 0

            for raw_item in basket:
                if not isinstance(raw_item, dict):
                    continue

                item_name = str(raw_item.get("name") or "").strip()
                if not item_name:
                    continue

                try:
                    quantity = int(raw_item.get("quantity") or 1)
                except (TypeError, ValueError):
                    quantity = 1
                if quantity < 1:
                    quantity = 1

                mode = str(raw_item.get("mode") or QuoteRequestItem.ItemMode.CATALOG).strip()
                if mode not in {QuoteRequestItem.ItemMode.CATALOG, QuoteRequestItem.ItemMode.MANUAL}:
                    mode = QuoteRequestItem.ItemMode.CATALOG

                external_id_raw = raw_item.get("external_id")
                try:
                    external_product_id = int(external_id_raw) if external_id_raw not in (None, "") else None
                except (TypeError, ValueError):
                    external_product_id = None

                item = QuoteRequestItem.objects.create(
                    quote_request=quote,
                    mode=mode,
                    external_product_id=external_product_id,
                    product_name=item_name,
                    sku=str(raw_item.get("sku") or "").strip(),
                    quantity=quantity,
                    quality_level=str(raw_item.get("qualityLevel") or "").strip(),
                    quality_label=str(raw_item.get("qualityLabel") or "").strip(),
                    comment=str(raw_item.get("comment") or "").strip(),
                )
                created_items += 1

                client_item_id = str(raw_item.get("id") or "").strip()
                if client_item_id:
                    photo_field = f"photos__{client_item_id}"
                    for uploaded in request.FILES.getlist(photo_field):
                        QuoteRequestItemPhoto.objects.create(
                            item=item,
                            image=uploaded,
                            original_name=getattr(uploaded, "name", "")[:255],
                        )
                        created_photos += 1

            if created_items == 0:
                return Response(
                    {"detail": "Nenhum item valido foi enviado para a cotacao."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "success": True,
                "message": "Cotacao recebida com sucesso.",
                "quote_id": quote.id,
                "protocol": str(quote.public_id),
                "items_count": created_items,
                "photos_count": created_photos,
            },
            status=status.HTTP_201_CREATED,
        )


class CheckoutCreateSaleView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        items = payload.get("items") or []
        if not isinstance(items, list) or not items:
            return Response(
                {"detail": "Envie ao menos um item para registrar a venda."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def to_decimal(raw, default="0"):
            try:
                return Decimal(str(raw if raw is not None else default))
            except (InvalidOperation, TypeError, ValueError):
                return Decimal(default)

        customer = payload.get("customer") or {}
        coupon_code = str(payload.get("coupon_code") or "").strip()
        discount_amount = to_decimal(payload.get("discount_amount"), "0")
        total_amount = to_decimal(payload.get("total_amount"), "0")
        with transaction.atomic():
            sale = Sale.objects.create(
                user=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
                customer_name=str(customer.get("name") or "").strip(),
                customer_email=str(customer.get("email") or "").strip(),
                customer_phone=str(customer.get("phone") or "").strip(),
                customer_city=str(customer.get("city") or "").strip(),
                customer_state=str(customer.get("state") or "").strip(),
                coupon_code=coupon_code,
                discount_amount=discount_amount,
                total_amount=total_amount,
            )

            valid_items = 0
            for raw_item in items:
                if not isinstance(raw_item, dict):
                    continue
                product_name = str(raw_item.get("name") or "").strip()
                if not product_name:
                    continue
                try:
                    quantity = int(raw_item.get("quantity") or 1)
                except (TypeError, ValueError):
                    quantity = 1
                if quantity < 1:
                    quantity = 1

                unit_price = to_decimal(raw_item.get("unit_price"), "0")
                total_price = to_decimal(raw_item.get("total_price"), "0")
                if total_price <= 0:
                    total_price = unit_price * quantity

                product_id_raw = raw_item.get("product_id")
                try:
                    product_id = int(product_id_raw) if product_id_raw not in (None, "") else None
                except (TypeError, ValueError):
                    product_id = None

                SaleItem.objects.create(
                    sale=sale,
                    product_id=product_id,
                    product_name=product_name,
                    platform=str(raw_item.get("platform") or "").strip(),
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price,
                )
                valid_items += 1

            if valid_items == 0:
                return Response(
                    {"detail": "Nenhum item válido para registrar a venda."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "success": True,
                "sale_id": sale.id,
                "protocol": str(sale.public_id),
            },
            status=status.HTTP_201_CREATED,
        )


class StorePublicSettingsView(APIView):
    """Endpoint público – retorna nome e logo da loja sem autenticação."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        cfg = StoreSettings.get()
        logo_url = None
        if cfg.logo:
            logo_url = request.build_absolute_uri(cfg.logo.url)
        return Response({
            "store_name": cfg.store_name,
            "logo_url": logo_url,
        })
