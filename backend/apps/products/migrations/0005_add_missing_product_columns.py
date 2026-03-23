from django.db import migrations


def add_missing_product_columns(apps, schema_editor):
    """Add columns that are in the Product model but absent from the DB table."""
    connection = schema_editor.connection
    cursor = connection.cursor()

    # PostgreSQL: fetch existing columns from information_schema
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'products'
    """)
    existing = {row[0] for row in cursor.fetchall()}

    columns_to_add = [
        # (column_name, sql_definition)
        ("condition",         "condition VARCHAR(50) NOT NULL DEFAULT ''"),
        ("in_stock",          "in_stock BOOLEAN NOT NULL DEFAULT TRUE"),
        ("installments",      "installments INTEGER NOT NULL DEFAULT 10"),
        ("installment_price", "installment_price DECIMAL(10,2) NULL"),
        ("sku",               "sku VARCHAR(100) NOT NULL DEFAULT ''"),
        ("rating",            "rating DECIMAL(3,1) NOT NULL DEFAULT 0"),
        ("review_count",      "review_count INTEGER NOT NULL DEFAULT 0"),
        ("details",           "details TEXT NOT NULL DEFAULT '[]'"),
        ("gallery_images",    "gallery_images TEXT NOT NULL DEFAULT '[]'"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name not in existing:
            cursor.execute(f"ALTER TABLE products ADD COLUMN {col_def}")

    # SKU needs a unique partial index (safe for rows with empty strings)
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS products_sku_uniq
        ON products(sku)
        WHERE sku != ''
    """)


class Migration(migrations.Migration):
    """Add all missing Product model columns to the products table."""

    dependencies = [
        ("products", "0004_add_products_external_id"),
    ]

    operations = [
        migrations.RunPython(add_missing_product_columns, migrations.RunPython.noop),
    ]
