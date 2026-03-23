from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_quoterequest_status_fields"),
    ]

    operations = [
        # Remove quote-level admin response fields
        migrations.RemoveField(
            model_name="quoterequest",
            name="admin_price_offer",
        ),
        migrations.RemoveField(
            model_name="quoterequest",
            name="admin_store_credit",
        ),
        migrations.RemoveField(
            model_name="quoterequest",
            name="admin_conditions",
        ),
        # Add per-item admin response fields
        migrations.AddField(
            model_name="quoterequestitem",
            name="admin_price_offer",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                verbose_name="valor ofertado (R$)",
            ),
        ),
        migrations.AddField(
            model_name="quoterequestitem",
            name="admin_store_credit",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                verbose_name="credito de loja (R$)",
            ),
        ),
        migrations.AddField(
            model_name="quoterequestitem",
            name="admin_conditions",
            field=models.TextField(
                blank=True,
                default="",
                verbose_name="condicoes / observacoes",
            ),
        ),
    ]
