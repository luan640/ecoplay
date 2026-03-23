from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("external_id", models.PositiveIntegerField(blank=True, null=True, unique=True, verbose_name="id externo")),
                ("name", models.CharField(max_length=255, verbose_name="nome")),
                ("slug", models.SlugField(max_length=255, unique=True)),
                ("description", models.TextField(blank=True, default="", verbose_name="descrição")),
                ("platform", models.CharField(blank=True, default="", max_length=120, verbose_name="plataforma")),
                ("category", models.CharField(blank=True, default="", max_length=120, verbose_name="categoria")),
                ("condition", models.CharField(blank=True, default="", max_length=50, verbose_name="condição")),
                ("price", models.DecimalField(decimal_places=2, max_digits=10, verbose_name="preço")),
                ("old_price", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name="preço antigo")),
                ("pix_price", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name="preço pix")),
                ("stock", models.PositiveIntegerField(default=0, verbose_name="estoque")),
                ("in_stock", models.BooleanField(default=True, verbose_name="em estoque")),
                ("installments", models.PositiveIntegerField(default=10, verbose_name="parcelas")),
                ("installment_price", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name="valor da parcela")),
                ("sku", models.CharField(max_length=100, unique=True)),
                ("rating", models.DecimalField(decimal_places=1, default=0, max_digits=3, verbose_name="avaliação")),
                ("review_count", models.PositiveIntegerField(default=0, verbose_name="quantidade de avaliações")),
                ("details", models.JSONField(blank=True, default=list, verbose_name="características")),
                ("gallery_images", models.JSONField(blank=True, default=list, verbose_name="galeria de imagens")),
                ("image", models.ImageField(blank=True, null=True, upload_to="products/", verbose_name="imagem")),
                ("is_active", models.BooleanField(default=True, verbose_name="ativo")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="criado em")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="atualizado em")),
            ],
            options={
                "db_table": "products",
                "ordering": ["-id"],
                "verbose_name": "produto",
                "verbose_name_plural": "produtos",
            },
        ),
    ]
