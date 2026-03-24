from django.conf import settings
from django.db import models
from django.db.models import Avg
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver


class Category(models.Model):
    name = models.CharField("nome", max_length=120, unique=True)
    is_active = models.BooleanField("ativa", default=True)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "categories"
        ordering = ["name"]
        verbose_name = "categoria"
        verbose_name_plural = "categorias"

    def __str__(self) -> str:
        return self.name


class Platform(models.Model):
    name = models.CharField("nome", max_length=120, unique=True)
    is_active = models.BooleanField("ativa", default=True)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "platforms"
        ordering = ["name"]
        verbose_name = "plataforma"
        verbose_name_plural = "plataformas"

    def __str__(self) -> str:
        return self.name


class Subplatform(models.Model):
    platform = models.ForeignKey(
        Platform,
        on_delete=models.CASCADE,
        related_name="subplatforms",
        verbose_name="plataforma",
    )
    name = models.CharField("nome", max_length=120)
    is_active = models.BooleanField("ativa", default=True)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "subplatforms"
        ordering = ["platform__name", "name"]
        unique_together = [["platform", "name"]]
        verbose_name = "subplataforma"
        verbose_name_plural = "subplataformas"

    def __str__(self) -> str:
        return f"{self.platform.name} → {self.name}"


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENT = "PERCENT", "Percentual"
        FIXED = "FIXED", "Valor fixo"

    code = models.CharField("código", max_length=50, unique=True)
    discount_type = models.CharField(
        "tipo de desconto",
        max_length=10,
        choices=DiscountType.choices,
        default=DiscountType.PERCENT,
    )
    value = models.DecimalField("valor do desconto", max_digits=10, decimal_places=2)
    min_order_value = models.DecimalField(
        "valor mínimo do pedido",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    max_discount_value = models.DecimalField(
        "desconto máximo",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    starts_at = models.DateTimeField("início", null=True, blank=True)
    ends_at = models.DateTimeField("fim", null=True, blank=True)
    usage_limit = models.PositiveIntegerField("limite de uso", null=True, blank=True)
    usage_limit_per_user = models.PositiveIntegerField(
        "limite por usuario", null=True, blank=True
    )
    used_count = models.PositiveIntegerField("total de usos", default=0)
    is_active = models.BooleanField("ativo", default=True)
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        db_table = "coupons"
        ordering = ["-id"]
        verbose_name = "cupom"
        verbose_name_plural = "cupons"

    def __str__(self) -> str:
        return self.code


class Product(models.Model):
    external_id = models.PositiveIntegerField("id externo", null=True, blank=True, unique=True)
    name = models.CharField("nome", max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField("descrição", blank=True, default="")
    platform = models.CharField("plataforma", max_length=120, blank=True, default="")
    subplatform = models.CharField("subplataforma", max_length=120, blank=True, default="")
    category = models.CharField("categoria", max_length=120, blank=True, default="")
    condition = models.CharField("condição", max_length=50, blank=True, default="")
    price = models.DecimalField("preço", max_digits=10, decimal_places=2)
    old_price = models.DecimalField(
        "preço antigo", max_digits=10, decimal_places=2, null=True, blank=True
    )
    pix_price = models.DecimalField(
        "preço pix", max_digits=10, decimal_places=2, null=True, blank=True
    )
    stock = models.PositiveIntegerField("estoque", default=0)
    in_stock = models.BooleanField("em estoque", default=True)
    installments = models.PositiveIntegerField("parcelas", default=10)
    installment_price = models.DecimalField(
        "valor da parcela", max_digits=10, decimal_places=2, null=True, blank=True
    )
    sku = models.CharField(max_length=100, unique=True)
    rating = models.DecimalField("avaliação", max_digits=3, decimal_places=1, default=0)
    review_count = models.PositiveIntegerField("quantidade de avaliações", default=0)
    details = models.JSONField("características", default=list, blank=True)
    gallery_images = models.JSONField("galeria de imagens", default=list, blank=True)
    image = models.ImageField("imagem", upload_to="products/", null=True, blank=True)
    is_active = models.BooleanField("ativo", default=True)
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["-id"]
        verbose_name = "produto"
        verbose_name_plural = "produtos"

    def __str__(self) -> str:
        return self.name


class QuoteProduct(models.Model):
    external_id = models.PositiveIntegerField("id externo", unique=True, db_index=True)
    name = models.CharField("nome", max_length=255)
    sku = models.CharField("sku", max_length=100, db_index=True)
    cover_image_url = models.URLField("url da capa", max_length=600, blank=True, default="")
    local_image_path = models.CharField(
        "caminho local da imagem", max_length=600, blank=True, default=""
    )
    image_exists = models.BooleanField("imagem local existe", default=False)
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        db_table = "quote_products"
        ordering = ["external_id"]
        verbose_name = "produto de cotacao"
        verbose_name_plural = "produtos de cotacao"

    def __str__(self) -> str:
        return f"{self.external_id} - {self.name}"


# ---------------------------------------------------------------------------
# Vitrine
# ---------------------------------------------------------------------------

MAX_SHOWCASE_ITEMS = 10


class Showcase(models.Model):
    SLUG_RECENTES = "recentes"
    SLUG_CONSOLES = "consoles"
    SLUG_JOGOS = "jogos"

    name = models.CharField("nome", max_length=120)
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField("título exibido", max_length=200, blank=True, default="")
    subtitle = models.CharField("subtítulo exibido", max_length=300, blank=True, default="")
    is_active = models.BooleanField("ativa", default=True)
    order = models.PositiveIntegerField("ordem", default=0)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "showcases"
        ordering = ["order", "id"]
        verbose_name = "vitrine"
        verbose_name_plural = "vitrines"

    def __str__(self) -> str:
        return self.name

    @property
    def items_count(self) -> int:
        return self.showcase_items.count()


class ShowcaseItem(models.Model):
    showcase = models.ForeignKey(
        Showcase,
        on_delete=models.CASCADE,
        related_name="showcase_items",
        verbose_name="vitrine",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="showcase_items",
        verbose_name="produto",
    )
    order = models.PositiveIntegerField("ordem", default=0)
    added_at = models.DateTimeField("adicionado em", auto_now_add=True)

    class Meta:
        db_table = "showcase_items"
        ordering = ["order", "added_at"]
        unique_together = [["showcase", "product"]]
        verbose_name = "item da vitrine"
        verbose_name_plural = "itens da vitrine"

    def __str__(self) -> str:
        return f"{self.showcase.name} → {self.product.name}"


# ---------------------------------------------------------------------------
# Configurações da loja (singleton)
# ---------------------------------------------------------------------------


class StoreSettings(models.Model):
    """Singleton – sempre acessado via StoreSettings.get()."""

    store_name = models.CharField(
        "nome da loja",
        max_length=100,
        default="Game Shop",
        help_text="Nome exibido no header, footer, checkout e nas páginas da loja.",
    )
    logo = models.ImageField(
        "logo da loja",
        upload_to="store/logo/",
        blank=True,
        null=True,
        help_text="Imagem de logo exibida no header, footer e checkout.",
    )
    allow_zero_stock_sale = models.BooleanField(
        "aceitar venda com estoque zerado",
        default=False,
        help_text="Se ativo, permite finalizar vendas mesmo quando o produto está sem estoque.",
    )
    show_zero_stock_products = models.BooleanField(
        "mostrar produtos sem estoque",
        default=False,
        help_text="Se ativo, produtos com estoque zero são exibidos na vitrine/busca.",
    )
    show_zero_price_products = models.BooleanField(
        "mostrar produtos com valor zerado",
        default=False,
        help_text="Se ativo, produtos com preço zero são exibidos na vitrine/busca.",
    )
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        db_table = "store_settings"
        verbose_name = "configuração da loja"
        verbose_name_plural = "configurações da loja"

    def __str__(self) -> str:
        return "Configurações da loja"

    @classmethod
    def get(cls) -> "StoreSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


# ---------------------------------------------------------------------------
# Estoque — Movimentações
# ---------------------------------------------------------------------------


class StockMovementType(models.TextChoices):
    ENTRADA = "entrada", "Entrada"
    SAIDA = "saida", "Saída"


class StockMovement(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="stock_movements",
        verbose_name="produto",
    )
    movement_type = models.CharField(
        "tipo",
        max_length=10,
        choices=StockMovementType.choices,
        db_index=True,
    )
    quantity = models.PositiveIntegerField("quantidade", default=1)
    reason = models.CharField("motivo", max_length=100, blank=True, default="")
    reference = models.CharField("referência", max_length=200, blank=True, default="")
    notes = models.TextField("observações", blank=True, default="")
    stock_before = models.IntegerField("estoque antes", default=0)
    stock_after = models.IntegerField("estoque depois", default=0)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "stock_movements"
        ordering = ["-created_at"]
        verbose_name = "movimentação de estoque"
        verbose_name_plural = "movimentações de estoque"

    def __str__(self) -> str:
        return f"{self.get_movement_type_display()} {self.quantity}x {self.product.name}"


# ---------------------------------------------------------------------------
# Avaliações de produtos
# ---------------------------------------------------------------------------


class Review(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="produto",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="usuário",
    )
    rating = models.PositiveSmallIntegerField(
        "nota",
        choices=[(i, str(i)) for i in range(1, 6)],
    )
    comment = models.TextField("comentário", blank=True, default="")
    verified_purchase = models.BooleanField("compra verificada", default=False)
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        db_table = "reviews"
        unique_together = [["product", "user"]]
        ordering = ["-created_at"]
        verbose_name = "avaliação"
        verbose_name_plural = "avaliações"

    def __str__(self) -> str:
        return f"{self.user} → {self.product.name} ({self.rating}★)"


@receiver([post_save, post_delete], sender=Review)
def update_product_rating(sender, instance, **kwargs):
    product = instance.product
    agg = Review.objects.filter(product=product).aggregate(
        avg=Avg("rating"), count=models.Count("id")
    )
    count = agg["count"] or 0
    avg = agg["avg"] or 0
    product.rating = round(float(avg), 1)
    product.review_count = count
    product.save(update_fields=["rating", "review_count"])
