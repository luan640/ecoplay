from django.db import migrations


def add_external_id_if_missing(apps, schema_editor):
    """Add external_id column to products table only if it doesn't already exist."""
    connection = schema_editor.connection
    cursor = connection.cursor()

    # PostgreSQL: check information_schema for column existence
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'external_id'
    """)
    column_exists = cursor.fetchone() is not None

    if not column_exists:
        # PostgreSQL supports ADD COLUMN directly; UNIQUE partial index handles nulls
        cursor.execute(
            "ALTER TABLE products ADD COLUMN external_id INTEGER NULL"
        )
        cursor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS products_external_id_uniq "
            "ON products(external_id) WHERE external_id IS NOT NULL"
        )


class Migration(migrations.Migration):
    """
    Adds external_id to the products table if it doesn't already exist.
    Handles the case where the table was created without this column.
    """

    dependencies = [
        ("products", "0003_alter_quoteproduct_sku"),
    ]

    operations = [
        migrations.RunPython(add_external_id_if_missing, migrations.RunPython.noop),
    ]
