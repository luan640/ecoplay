"""
Import platforms and categories from CSV files into the database.

Usage:
    python manage.py import_plataformas_categorias
    python manage.py import_plataformas_categorias --plataformas path/to/plataformas.csv --categorias path/to/categoria.csv
"""

import csv
import os

from django.core.management.base import BaseCommand

from apps.products.models import Category, Platform


class Command(BaseCommand):
    help = "Importa plataformas e categorias dos CSVs para o banco de dados."

    def add_arguments(self, parser):
        parser.add_argument(
            "--plataformas",
            default=None,
            help="Caminho para plataformas.csv (padrão: <BASE_DIR>/plataformas.csv)",
        )
        parser.add_argument(
            "--categorias",
            default=None,
            help="Caminho para categoria.csv (padrão: <BASE_DIR>/categoria.csv)",
        )

    def handle(self, *args, **options):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # Walk up to the backend/ root (4 levels: commands -> management -> products -> apps -> backend)
        backend_root = os.path.abspath(os.path.join(base_dir, "..", "..", "..", ".."))

        plataformas_path = options["plataformas"] or os.path.join(backend_root, "plataformas.csv")
        categorias_path = options["categorias"] or os.path.join(backend_root, "categoria.csv")

        # --- Plataformas ---
        created_p = skipped_p = 0
        try:
            with open(plataformas_path, encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    name = row.get("name", "").strip()
                    if not name:
                        continue
                    _, created = Platform.objects.get_or_create(name=name)
                    if created:
                        created_p += 1
                    else:
                        skipped_p += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Plataformas: {created_p} criadas, {skipped_p} ja existiam."
                )
            )
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f"Arquivo nao encontrado: {plataformas_path}"))

        # --- Categorias ---
        created_c = skipped_c = 0
        try:
            with open(categorias_path, encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    name = row.get("name", "").strip()
                    if not name:
                        continue
                    _, created = Category.objects.get_or_create(name=name)
                    if created:
                        created_c += 1
                    else:
                        skipped_c += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Categorias:  {created_c} criadas, {skipped_c} ja existiam."
                )
            )
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f"Arquivo nao encontrado: {categorias_path}"))
