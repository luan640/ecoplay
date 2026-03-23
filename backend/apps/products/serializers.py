from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import (
    Product,
    QuoteProduct,
    Category,
    Platform,
    Subplatform,
    Coupon,
    Showcase,
    ShowcaseItem,
    MAX_SHOWCASE_ITEMS,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "is_active", "created_at"]
        read_only_fields = ["created_at"]


class PlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = ["id", "name", "is_active", "created_at"]
        read_only_fields = ["created_at"]


class SubplatformSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source="platform.name", read_only=True)

    class Meta:
        model = Subplatform
        fields = ["id", "platform", "platform_name", "name", "is_active", "created_at"]
        read_only_fields = ["created_at"]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "discount_type",
            "value",
            "min_order_value",
            "max_discount_value",
            "starts_at",
            "ends_at",
            "usage_limit",
            "usage_limit_per_user",
            "used_count",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["used_count", "created_at", "updated_at"]

    def validate_code(self, value: str):
        normalized = value.strip().upper()
        if not normalized:
            raise serializers.ValidationError("Código é obrigatório.")
        instance = getattr(self, "instance", None)
        query = Coupon.objects.filter(code__iexact=normalized)
        if instance:
            query = query.exclude(pk=instance.pk)
        if query.exists():
            raise serializers.ValidationError("Já existe um cupom com este código.")
        return normalized

    def validate(self, attrs):
        discount_type = attrs.get(
            "discount_type",
            getattr(self.instance, "discount_type", Coupon.DiscountType.PERCENT),
        )
        value = attrs.get("value", getattr(self.instance, "value", None))
        min_order_value = attrs.get(
            "min_order_value", getattr(self.instance, "min_order_value", None)
        )
        max_discount_value = attrs.get(
            "max_discount_value", getattr(self.instance, "max_discount_value", None)
        )
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        usage_limit = attrs.get("usage_limit", getattr(self.instance, "usage_limit", None))
        usage_limit_per_user = attrs.get(
            "usage_limit_per_user",
            getattr(self.instance, "usage_limit_per_user", None),
        )

        if value is None or value <= Decimal("0"):
            raise serializers.ValidationError(
                {"value": "Valor de desconto deve ser maior que zero."}
            )

        if discount_type == Coupon.DiscountType.PERCENT and value > Decimal("100"):
            raise serializers.ValidationError(
                {"value": "Para desconto percentual, o valor máximo é 100."}
            )

        if min_order_value is not None and min_order_value < Decimal("0"):
            raise serializers.ValidationError(
                {"min_order_value": "Valor mínimo não pode ser negativo."}
            )

        if max_discount_value is not None and max_discount_value <= Decimal("0"):
            raise serializers.ValidationError(
                {"max_discount_value": "Desconto máximo deve ser maior que zero."}
            )

        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError(
                {"ends_at": "A data final deve ser maior que a data inicial."}
            )

        if usage_limit is not None and usage_limit <= 0:
            raise serializers.ValidationError(
                {"usage_limit": "Limite de uso deve ser maior que zero."}
            )

        if usage_limit is not None and usage_limit < getattr(self.instance, "used_count", 0):
            raise serializers.ValidationError(
                {"usage_limit": "Limite de uso não pode ser menor que os usos já realizados."}
            )

        if usage_limit_per_user is not None and usage_limit_per_user <= 0:
            raise serializers.ValidationError(
                {"usage_limit_per_user": "Limite por usuário deve ser maior que zero."}
            )

        if (
            usage_limit is not None
            and usage_limit_per_user is not None
            and usage_limit_per_user > usage_limit
        ):
            raise serializers.ValidationError(
                {
                    "usage_limit_per_user": (
                        "Limite por usuário não pode ser maior que o limite total."
                    )
                }
            )

        if ends_at and ends_at < timezone.now() and attrs.get("is_active", True):
            # Permite salvar cupom expirado, mas evita marcá-lo como ativo por engano.
            raise serializers.ValidationError(
                {"is_active": "Cupom expirado não pode permanecer ativo."}
            )

        return attrs


class ShowcaseItemProductSerializer(serializers.ModelSerializer):
    """Produto resumido dentro de um item de vitrine."""
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "sku", "price", "image_url", "is_active"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class ShowcaseItemSerializer(serializers.ModelSerializer):
    product = ShowcaseItemProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )

    class Meta:
        model = ShowcaseItem
        fields = ["id", "product", "product_id", "order", "added_at"]
        read_only_fields = ["added_at"]

    def validate(self, attrs):
        showcase = self.context.get("showcase")
        if showcase and not self.instance:
            current = ShowcaseItem.objects.filter(showcase=showcase).count()
            if current >= MAX_SHOWCASE_ITEMS:
                raise serializers.ValidationError(
                    f"Limite de {MAX_SHOWCASE_ITEMS} produtos por vitrine atingido."
                )
            product = attrs.get("product")
            if product and ShowcaseItem.objects.filter(showcase=showcase, product=product).exists():
                raise serializers.ValidationError("Este produto já está nesta vitrine.")
        return attrs


class ShowcaseSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Showcase
        fields = ["id", "name", "slug", "title", "subtitle", "is_active", "order", "items_count", "created_at"]
        read_only_fields = ["created_at"]

    def get_items_count(self, obj):
        return obj.showcase_items.count()


class ShowcaseDetailSerializer(ShowcaseSerializer):
    items = ShowcaseItemSerializer(source="showcase_items", many=True, read_only=True)

    class Meta(ShowcaseSerializer.Meta):
        fields = ShowcaseSerializer.Meta.fields + ["items"]


class ProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "external_id",
            "name",
            "slug",
            "description",
            "platform",
            "subplatform",
            "category",
            "condition",
            "price",
            "old_price",
            "pix_price",
            "stock",
            "in_stock",
            "installments",
            "installment_price",
            "sku",
            "rating",
            "review_count",
            "details",
            "gallery_images",
            "image",
            "image_url",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "image_url"]

    def get_image_url(self, obj: Product):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        old_price = attrs.get("old_price", getattr(self.instance, "old_price", None))
        pix_price = attrs.get("pix_price", getattr(self.instance, "pix_price", None))
        if price is not None and old_price is not None and old_price < price:
            raise serializers.ValidationError(
                {"old_price": "O preço antigo deve ser maior ou igual ao preço atual."}
            )
        if price is not None and pix_price is not None and pix_price > price:
            raise serializers.ValidationError(
                {"pix_price": "O preço pix deve ser menor ou igual ao preço atual."}
            )
        return attrs


class QuoteProductSuggestionSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QuoteProduct
        fields = [
            "external_id",
            "name",
            "sku",
            "image_url",
            "cover_image_url",
            "local_image_path",
        ]

    def get_image_url(self, obj: QuoteProduct):
        if obj.cover_image_url:
            return obj.cover_image_url
        return ""
