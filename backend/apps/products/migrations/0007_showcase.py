from django.db import migrations, models
import django.db.models.deletion


def create_default_showcases(apps, schema_editor):
    Showcase = apps.get_model("products", "Showcase")
    defaults = [
        {"name": "Recentes no site", "slug": "recentes"},
        {"name": "Consoles",         "slug": "consoles"},
        {"name": "Jogos",            "slug": "jogos"},
    ]
    for data in defaults:
        Showcase.objects.get_or_create(slug=data["slug"], defaults={"name": data["name"]})


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0006_category_platform"),
    ]

    operations = [
        migrations.CreateModel(
            name="Showcase",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120, verbose_name="nome")),
                ("slug", models.SlugField(max_length=120, unique=True)),
                ("is_active", models.BooleanField(default=True, verbose_name="ativa")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="criado em")),
            ],
            options={
                "verbose_name": "vitrine",
                "verbose_name_plural": "vitrines",
                "db_table": "showcases",
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="ShowcaseItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("order", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                ("added_at", models.DateTimeField(auto_now_add=True, verbose_name="adicionado em")),
                (
                    "showcase",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="showcase_items",
                        to="products.showcase",
                        verbose_name="vitrine",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="showcase_items",
                        to="products.product",
                        verbose_name="produto",
                    ),
                ),
            ],
            options={
                "verbose_name": "item da vitrine",
                "verbose_name_plural": "itens da vitrine",
                "db_table": "showcase_items",
                "ordering": ["order", "added_at"],
                "unique_together": {("showcase", "product")},
            },
        ),
        migrations.RunPython(create_default_showcases, migrations.RunPython.noop),
    ]
