import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.products.models import QuoteProduct


class Command(BaseCommand):
    help = "Importa produtos de cotacao a partir de products.csv."

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            type=str,
            default=str(Path(settings.BASE_DIR) / "products.csv"),
            help="Caminho do CSV de entrada.",
        )
        parser.add_argument(
            "--images-dir",
            type=str,
            default=str(Path(settings.BASE_DIR) / "images"),
            help="Diretorio base das imagens locais.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Limpa a tabela de produtos de cotacao antes de importar.",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv"])
        images_dir = Path(options["images_dir"])
        clear_before_import = options["clear"]

        if not csv_path.exists():
            self.stdout.write(self.style.ERROR(f"CSV nao encontrado: {csv_path}"))
            return

        created_count = 0
        updated_count = 0
        skipped_count = 0

        with transaction.atomic():
            if clear_before_import:
                deleted_count, _ = QuoteProduct.objects.all().delete()
                self.stdout.write(f"Tabela limpa: {deleted_count} registros removidos.")

            with csv_path.open("r", encoding="utf-8", newline="") as csv_file:
                reader = csv.DictReader(csv_file)
                for row in reader:
                    try:
                        external_id = int(str(row.get("id", "")).strip())
                    except (TypeError, ValueError):
                        skipped_count += 1
                        continue

                    name = str(row.get("name", "")).strip()
                    sku = str(row.get("sku", "")).strip()
                    cover_image_url = str(row.get("cover_image_url", "")).strip()
                    local_image_path_raw = str(row.get("local_image_path", "")).strip()

                    if not name or not sku:
                        skipped_count += 1
                        continue

                    normalized_local_path = local_image_path_raw.replace("\\", "/")
                    image_file_path = (
                        Path(normalized_local_path)
                        if Path(normalized_local_path).is_absolute()
                        else (Path(settings.BASE_DIR) / normalized_local_path)
                    )
                    image_exists = image_file_path.exists()

                    defaults = {
                        "name": name,
                        "sku": sku,
                        "cover_image_url": cover_image_url,
                        "local_image_path": normalized_local_path,
                        "image_exists": image_exists,
                    }
                    obj, was_created = QuoteProduct.objects.update_or_create(
                        external_id=external_id,
                        defaults=defaults,
                    )

                    # Garante que o arquivo existe no diretorio informado, mesmo
                    # quando o CSV traz apenas caminho relativo.
                    if not obj.image_exists and normalized_local_path:
                        filename_only = Path(normalized_local_path).name
                        fallback_path = images_dir / filename_only
                        if fallback_path.exists():
                            obj.local_image_path = str(
                                (Path("images") / filename_only).as_posix()
                            )
                            obj.image_exists = True
                            obj.save(update_fields=["local_image_path", "image_exists"])

                    if was_created:
                        created_count += 1
                    else:
                        updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Importacao concluida: "
                f"{created_count} criados, {updated_count} atualizados, {skipped_count} ignorados."
            )
        )
