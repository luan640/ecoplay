from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0005_add_missing_product_columns"),
    ]

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120, unique=True, verbose_name="nome")),
                ("is_active", models.BooleanField(default=True, verbose_name="ativa")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="criado em")),
            ],
            options={
                "verbose_name": "categoria",
                "verbose_name_plural": "categorias",
                "db_table": "categories",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Platform",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120, unique=True, verbose_name="nome")),
                ("is_active", models.BooleanField(default=True, verbose_name="ativa")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="criado em")),
            ],
            options={
                "verbose_name": "plataforma",
                "verbose_name_plural": "plataformas",
                "db_table": "platforms",
                "ordering": ["name"],
            },
        ),
    ]
