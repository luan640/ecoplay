import uuid

from django.conf import settings
from django.db import models


class QuoteStatus(models.TextChoices):
    RECEBIDA = "recebida", "Recebida"
    RESPONDIDA = "respondida", "Respondida"
    FINALIZADA = "finalizada", "Finalizada"


class QuoteRequest(models.Model):
    public_id = models.UUIDField(
        "protocolo",
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quote_requests",
    )
    full_name = models.CharField("nome completo", max_length=255)
    email = models.EmailField("email")
    phone = models.CharField("telefone", max_length=30, blank=True, default="")
    city = models.CharField("cidade", max_length=180, blank=True, default="")
    source = models.CharField("origem", max_length=120, blank=True, default="")

    status = models.CharField(
        "status",
        max_length=20,
        choices=QuoteStatus.choices,
        default=QuoteStatus.RECEBIDA,
        db_index=True,
    )
    admin_responded_at = models.DateTimeField("respondida em", null=True, blank=True)
    admin_notes = models.TextField("observação geral", blank=True, default="")

    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        db_table = "quote_requests"
        ordering = ["-id"]
        verbose_name = "cotacao"
        verbose_name_plural = "cotacoes"

    def __str__(self) -> str:
        return f"Cotacao {self.public_id} - {self.full_name}"


class QuoteRequestItem(models.Model):
    class ItemMode(models.TextChoices):
        CATALOG = "catalog", "Catalogo"
        MANUAL = "manual", "Manual"

    quote_request = models.ForeignKey(
        QuoteRequest,
        on_delete=models.CASCADE,
        related_name="items",
    )
    mode = models.CharField(
        "modo",
        max_length=20,
        choices=ItemMode.choices,
        default=ItemMode.CATALOG,
    )
    external_product_id = models.PositiveIntegerField(
        "id externo do produto",
        null=True,
        blank=True,
    )
    product_name = models.CharField("nome do produto", max_length=255)
    sku = models.CharField("sku", max_length=120, blank=True, default="")
    quantity = models.PositiveIntegerField("quantidade", default=1)
    quality_level = models.CharField("nivel de condicao", max_length=30, blank=True, default="")
    quality_label = models.CharField("descricao da condicao", max_length=255, blank=True, default="")
    comment = models.TextField("comentario", blank=True, default="")

    admin_price_offer = models.DecimalField(
        "valor ofertado (R$)",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    admin_store_credit = models.DecimalField(
        "credito de loja (R$)",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    admin_conditions = models.TextField("condicoes / observacoes", blank=True, default="")

    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "quote_request_items"
        ordering = ["id"]
        verbose_name = "item da cotacao"
        verbose_name_plural = "itens da cotacao"

    def __str__(self) -> str:
        return f"{self.product_name} ({self.quantity})"


class QuoteRequestItemPhoto(models.Model):
    item = models.ForeignKey(
        QuoteRequestItem,
        on_delete=models.CASCADE,
        related_name="photos",
    )
    image = models.ImageField("imagem", upload_to="quote_requests/%Y/%m/%d/")
    original_name = models.CharField("nome original", max_length=255, blank=True, default="")
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "quote_request_item_photos"
        ordering = ["id"]
        verbose_name = "foto do item da cotacao"
        verbose_name_plural = "fotos dos itens da cotacao"

    def __str__(self) -> str:
        return self.original_name or f"Foto {self.id}"


class SaleStatus(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    EM_ANDAMENTO = "em_andamento", "Em andamento"
    FINALIZADA = "finalizada", "Finalizada"
    CANCELADA = "cancelada", "Cancelada"


class SalePaymentMethod(models.TextChoices):
    NAO_DEFINIDO = "nao_definido", "Não definido"
    PIX = "pix", "Pix"
    CARTAO = "cartao", "Cartão"
    BOLETO = "boleto", "Boleto"
    DINHEIRO = "dinheiro", "Dinheiro"
    TRANSFERENCIA = "transferencia", "Transferência"


class Sale(models.Model):
    public_id = models.UUIDField(
        "protocolo",
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    customer_name = models.CharField("nome do cliente", max_length=255, blank=True, default="")
    customer_email = models.EmailField("e-mail do cliente", blank=True, default="")
    customer_phone = models.CharField("telefone do cliente", max_length=30, blank=True, default="")
    customer_city = models.CharField("cidade", max_length=180, blank=True, default="")
    customer_state = models.CharField("estado", max_length=50, blank=True, default="")

    coupon_code = models.CharField("cupom", max_length=80, blank=True, default="")
    discount_amount = models.DecimalField(
        "desconto total",
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    total_amount = models.DecimalField(
        "valor total",
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    whatsapp_message = models.TextField("mensagem WhatsApp", blank=True, default="")
    whatsapp_url = models.URLField("url WhatsApp", max_length=1000, blank=True, default="")

    status = models.CharField(
        "status",
        max_length=20,
        choices=SaleStatus.choices,
        default=SaleStatus.PENDENTE,
        db_index=True,
    )
    payment_method = models.CharField(
        "meio de pagamento",
        max_length=20,
        choices=SalePaymentMethod.choices,
        default=SalePaymentMethod.NAO_DEFINIDO,
    )
    admin_notes = models.TextField("observações internas", blank=True, default="")
    finalized_at = models.DateTimeField("finalizada em", null=True, blank=True)
    created_at = models.DateTimeField("criada em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizada em", auto_now=True)

    class Meta:
        db_table = "sales"
        ordering = ["-id"]
        verbose_name = "venda"
        verbose_name_plural = "vendas"

    def __str__(self) -> str:
        return f"Venda {self.public_id}"


class SaleItem(models.Model):
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product_id = models.PositiveIntegerField("id do produto", null=True, blank=True)
    product_name = models.CharField("nome do produto", max_length=255)
    platform = models.CharField("plataforma", max_length=120, blank=True, default="")
    quantity = models.PositiveIntegerField("quantidade", default=1)
    unit_price = models.DecimalField("preço unitário", max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField("total do item", max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "sale_items"
        ordering = ["id"]
        verbose_name = "item da venda"
        verbose_name_plural = "itens da venda"

    def __str__(self) -> str:
        return f"{self.product_name} ({self.quantity})"
