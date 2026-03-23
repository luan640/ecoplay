from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0012_stockmovement"),
    ]

    operations = [
        migrations.CreateModel(
            name="StoreSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "allow_zero_stock_sale",
                    models.BooleanField(
                        default=False,
                        help_text="Se ativo, permite finalizar vendas mesmo quando o produto está sem estoque.",
                        verbose_name="aceitar venda com estoque zerado",
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="atualizado em")),
            ],
            options={
                "verbose_name": "configuração da loja",
                "verbose_name_plural": "configurações da loja",
                "db_table": "store_settings",
            },
        ),
    ]
