from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0011_coupon_usage_limit_per_user"),
    ]

    operations = [
        migrations.CreateModel(
            name="StockMovement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("movement_type", models.CharField(choices=[("entrada", "Entrada"), ("saida", "Saída")], db_index=True, max_length=10, verbose_name="tipo")),
                ("quantity", models.PositiveIntegerField(default=1, verbose_name="quantidade")),
                ("reason", models.CharField(blank=True, default="", max_length=100, verbose_name="motivo")),
                ("reference", models.CharField(blank=True, default="", max_length=200, verbose_name="referência")),
                ("notes", models.TextField(blank=True, default="", verbose_name="observações")),
                ("stock_before", models.IntegerField(default=0, verbose_name="estoque antes")),
                ("stock_after", models.IntegerField(default=0, verbose_name="estoque depois")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="criado em")),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stock_movements",
                        to="products.product",
                        verbose_name="produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "movimentação de estoque",
                "verbose_name_plural": "movimentações de estoque",
                "db_table": "stock_movements",
                "ordering": ["-created_at"],
            },
        ),
    ]
