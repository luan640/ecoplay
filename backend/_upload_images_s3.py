"""
Faz upload de todas as imagens locais (backend/media/products/) para o Supabase S3.
Requer que AWS_ACCESS_KEY_ID (e demais vars) estejam configuradas no ambiente.

Uso:
    python _upload_images_s3.py
    python _upload_images_s3.py --dry-run    # só lista o que faria
    python _upload_images_s3.py --skip-existing  # pula arquivos já no bucket (padrão)
    python _upload_images_s3.py --overwrite  # sobrescreve tudo
"""

import argparse
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Django setup
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.conf import settings
import boto3
from botocore.exceptions import ClientError

# ---------------------------------------------------------------------------
# Validate S3 is configured
# ---------------------------------------------------------------------------
if not os.getenv("AWS_ACCESS_KEY_ID"):
    print("ERRO: AWS_ACCESS_KEY_ID não está definida. Configure as variáveis de ambiente do S3.")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
LOCAL_DIR = BASE_DIR / "images"

if not LOCAL_DIR.exists():
    print(f"ERRO: pasta {LOCAL_DIR} não encontrada.")
    sys.exit(1)

BUCKET    = settings.AWS_STORAGE_BUCKET_NAME
ENDPOINT  = settings.AWS_S3_ENDPOINT_URL
S3_PREFIX = "products"  # pasta dentro do bucket

s3 = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    endpoint_url=ENDPOINT,
    region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def list_existing_keys(prefix: str) -> set[str]:
    """Retorna o conjunto de keys já presentes no bucket sob o prefix."""
    existing = set()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix + "/"):
        for obj in page.get("Contents", []):
            existing.add(obj["Key"])
    return existing


CONTENT_TYPES = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".gif":  "image/gif",
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",       action="store_true", help="Não envia nada, só lista")
    parser.add_argument("--overwrite",     action="store_true", help="Sobrescreve arquivos existentes no bucket")
    parser.add_argument("--skip-existing", action="store_true", default=True,
                        help="Pula arquivos já existentes no bucket (padrão)")
    args = parser.parse_args()

    files = sorted(LOCAL_DIR.iterdir())
    total = len(files)
    print(f"Arquivos locais encontrados: {total}")
    print(f"Bucket: {BUCKET}  |  Endpoint: {ENDPOINT}")

    existing: set[str] = set()
    if not args.overwrite and not args.dry_run:
        print("Listando arquivos já presentes no bucket...", end=" ", flush=True)
        existing = list_existing_keys(S3_PREFIX)
        print(f"{len(existing)} encontrados.")

    uploaded = skipped = errors = 0

    for i, path in enumerate(files, 1):
        if not path.is_file():
            continue

        key = f"{S3_PREFIX}/{path.name}"
        content_type = CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream")

        if args.dry_run:
            print(f"  [dry-run] {key}")
            uploaded += 1
            continue

        if not args.overwrite and key in existing:
            skipped += 1
            continue

        try:
            s3.upload_file(
                str(path),
                BUCKET,
                key,
                ExtraArgs={"ContentType": content_type},
            )
            uploaded += 1
        except ClientError as exc:
            print(f"  ERRO ao enviar {path.name}: {exc}")
            errors += 1

        if i % 500 == 0 or i == total:
            print(f"  [{i}/{total}] enviados={uploaded} pulados={skipped} erros={errors}")

    print(f"\nConcluído. Enviados: {uploaded}  |  Pulados: {skipped}  |  Erros: {errors}")


if __name__ == "__main__":
    main()
