"""
Importa produtos do products.csv associando as imagens de capa
que estão na pasta backend/images/.

Uso (dentro de backend/):
    python _import_products_csv.py
"""
import django
import os
import csv
import shutil
import sys
from pathlib import Path

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from django.utils.text import slugify
from django.conf import settings
from apps.products.models import Product

BASE_DIR   = Path(__file__).parent
IMAGES_DIR = BASE_DIR / 'images'
MEDIA_PRODUCTS = Path(settings.MEDIA_ROOT) / 'products'
MEDIA_PRODUCTS.mkdir(parents=True, exist_ok=True)

CSV_FILE = BASE_DIR / 'products.csv'
BATCH_SIZE = 500

# ---------------------------------------------------------------------------
# Pré-carregar dados existentes
# ---------------------------------------------------------------------------
print('Carregando dados existentes…')
existing_skus  = set(Product.objects.values_list('sku',  flat=True))
existing_slugs = set(Product.objects.values_list('slug', flat=True))
print(f'  Produtos já cadastrados: {len(existing_skus)}')


def make_unique_slug(base: str) -> str:
    slug = base[:255] or 'produto'
    if slug not in existing_slugs:
        return slug
    i = 1
    while True:
        candidate = f'{base[:250]}-{i}'
        if candidate not in existing_slugs:
            return candidate
        i += 1


# ---------------------------------------------------------------------------
# Leitura do CSV
# ---------------------------------------------------------------------------
print(f'Lendo {CSV_FILE}…')
with open(CSV_FILE, encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

total = len(rows)
print(f'  Total de linhas: {total}')

# ---------------------------------------------------------------------------
# Importação
# ---------------------------------------------------------------------------
created   = 0
skipped   = 0
no_image  = 0
batch: list[Product] = []

for idx, row in enumerate(rows, 1):
    sku = row['sku'].strip()

    if sku in existing_skus:
        skipped += 1
        if idx % 2000 == 0:
            print(f'  [{idx}/{total}] criados={created} pulados={skipped} sem_img={no_image}')
        continue

    # --- Nome e slug --------------------------------------------------------
    name       = row['name'].strip()
    base_slug  = slugify(name) or f'produto-{sku.lower()}'
    slug       = make_unique_slug(base_slug)

    existing_skus.add(sku)
    existing_slugs.add(slug)

    # --- external_id --------------------------------------------------------
    try:
        external_id = int(row['id'].strip())
    except (ValueError, KeyError):
        external_id = None

    # --- Imagem de capa -----------------------------------------------------
    image_field = ''
    local_path_raw = row.get('local_image_path', '').strip()
    if local_path_raw:
        src = BASE_DIR / local_path_raw.replace('\\', '/')
        if src.exists():
            dest = MEDIA_PRODUCTS / src.name
            if not dest.exists():
                shutil.copy2(src, dest)
            image_field = f'products/{src.name}'
        else:
            no_image += 1
    else:
        no_image += 1

    # --- Montar objeto (sem salvar ainda) -----------------------------------
    p = Product(
        external_id=external_id,
        name=name,
        slug=slug,
        sku=sku,
        price=0,
        stock=0,
        in_stock=False,
        is_active=True,
    )
    if image_field:
        p.image = image_field

    batch.append(p)

    if len(batch) >= BATCH_SIZE:
        Product.objects.bulk_create(batch, ignore_conflicts=True)
        created += len(batch)
        batch = []
        print(f'  [{idx}/{total}] criados={created} pulados={skipped} sem_img={no_image}')

# Último lote
if batch:
    Product.objects.bulk_create(batch, ignore_conflicts=True)
    created += len(batch)

print()
print('=' * 55)
print(f'Concluído!')
print(f'  Criados  : {created}')
print(f'  Pulados  : {skipped}  (já existiam no banco)')
print(f'  Sem imagem: {no_image}')
print('=' * 55)
