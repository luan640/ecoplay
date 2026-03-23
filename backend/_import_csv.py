import django, os, csv
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from apps.products.models import Platform, Category

# --- Plataformas ---
created_p = skipped_p = 0
with open('plataformas.csv', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        name = row['name'].strip()
        if not name:
            continue
        _, created = Platform.objects.get_or_create(name=name)
        if created:
            created_p += 1
        else:
            skipped_p += 1

print(f'Plataformas: {created_p} criadas, {skipped_p} ja existiam')

# --- Categorias ---
created_c = skipped_c = 0
with open('categoria.csv', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        name = row['name'].strip()
        if not name:
            continue
        _, created = Category.objects.get_or_create(name=name)
        if created:
            created_c += 1
        else:
            skipped_c += 1

print(f'Categorias:  {created_c} criadas, {skipped_c} ja existiam')
