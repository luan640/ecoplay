from decimal import Decimal
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.products.models import Product


SEED_PRODUCTS = [
    {
        "external_id": 1,
        "name": "PlayStation 5 - Console Digital Edition",
        "slug": "playstation-5-digital",
        "image_path": "ps5.jpg",
        "gallery_images": ["/images/ps5.jpg", "/images/ps5-2.jpg"],
        "old_price": "3999.00",
        "price": "2799.00",
        "pix_price": "2659.00",
        "platform": "PS5",
        "category": "console",
        "condition": "Usado",
        "in_stock": True,
        "stock": 5,
        "installments": 10,
        "installment_price": "279.90",
        "sku": "MGU-001",
        "rating": "4.9",
        "review_count": 128,
        "description": "PlayStation 5 Digital Edition em perfeito estado de funcionamento. Console sem leitor de disco, ideal para quem compra jogos digitais.",
        "details": [
            {"label": "Plataforma", "value": "PlayStation 5"},
            {"label": "Modelo", "value": "Digital Edition"},
            {"label": "Armazenamento", "value": "825GB SSD"},
            {"label": "Condição", "value": "Usado"},
        ],
    },
    {
        "external_id": 2,
        "name": "Xbox Series X - 1TB SSD",
        "slug": "xbox-series-x",
        "image_path": "xbox-series-x.jpg",
        "gallery_images": ["/images/xbox-series-x.jpg"],
        "old_price": "3799.00",
        "price": "2599.00",
        "pix_price": "2469.00",
        "platform": "Xbox",
        "category": "console",
        "condition": "Seminovo",
        "in_stock": True,
        "stock": 4,
        "installments": 10,
        "installment_price": "259.90",
        "sku": "MGU-002",
        "rating": "4.8",
        "review_count": 74,
        "description": "Xbox Series X com 1TB de armazenamento SSD. Console seminovo em excelente estado.",
        "details": [
            {"label": "Plataforma", "value": "Xbox Series X"},
            {"label": "Armazenamento", "value": "1TB SSD NVMe"},
            {"label": "Condição", "value": "Seminovo"},
        ],
    },
    {
        "external_id": 3,
        "name": "Nintendo Switch OLED - Branco",
        "slug": "nintendo-switch-oled",
        "image_path": "nintendo-switch.jpg",
        "gallery_images": ["/images/nintendo-switch.jpg"],
        "old_price": "2299.00",
        "price": "1599.00",
        "pix_price": "1519.00",
        "platform": "Nintendo",
        "category": "console",
        "condition": "Seminovo",
        "in_stock": True,
        "stock": 6,
        "installments": 10,
        "installment_price": "159.90",
        "sku": "MGU-003",
        "rating": "4.9",
        "review_count": 91,
        "description": "Nintendo Switch OLED branco com tela de 7 polegadas. Seminovo em ótimo estado.",
        "details": [
            {"label": "Plataforma", "value": "Nintendo Switch OLED"},
            {"label": "Tela", "value": "7 OLED"},
            {"label": "Condição", "value": "Seminovo"},
        ],
    },
    {
        "external_id": 4,
        "name": "PlayStation 4 Slim - 500GB",
        "slug": "playstation-4-slim",
        "image_path": "ps4-slim.jpg",
        "gallery_images": ["/images/ps4-slim.jpg"],
        "old_price": "1699.00",
        "price": "1099.00",
        "pix_price": "1044.00",
        "platform": "PS4",
        "category": "console",
        "condition": "Usado",
        "in_stock": True,
        "stock": 7,
        "installments": 10,
        "installment_price": "109.90",
        "sku": "MGU-004",
        "rating": "4.7",
        "review_count": 56,
        "description": "PlayStation 4 Slim 500GB usado em bom estado e funcionando perfeitamente.",
        "details": [
            {"label": "Plataforma", "value": "PlayStation 4 Slim"},
            {"label": "Armazenamento", "value": "500GB HDD"},
            {"label": "Condição", "value": "Usado"},
        ],
    },
    {
        "external_id": 5,
        "name": "Xbox Series S - 512GB",
        "slug": "xbox-series-s",
        "image_path": "xbox-series-s.jpg",
        "gallery_images": ["/images/xbox-series-s.jpg"],
        "old_price": "2299.00",
        "price": "1599.00",
        "pix_price": "1519.00",
        "platform": "Xbox",
        "category": "console",
        "condition": "Usado",
        "in_stock": True,
        "stock": 8,
        "installments": 10,
        "installment_price": "159.90",
        "sku": "MGU-005",
        "rating": "4.6",
        "review_count": 43,
        "description": "Xbox Series S compacto e potente, all-digital, em excelente estado.",
        "details": [
            {"label": "Plataforma", "value": "Xbox Series S"},
            {"label": "Armazenamento", "value": "512GB SSD"},
            {"label": "Condição", "value": "Usado"},
        ],
    },
    {
        "external_id": 6,
        "name": "God of War: Ragnarok - PS5",
        "slug": "god-of-war-ragnarok-ps5",
        "image_path": "god-of-war.jpg",
        "gallery_images": ["/images/god-of-war.jpg", "/images/god-of-war-2.jpg"],
        "old_price": "299.00",
        "price": "199.00",
        "pix_price": "189.00",
        "platform": "PS5",
        "category": "jogo",
        "condition": "Usado",
        "in_stock": True,
        "stock": 12,
        "installments": 10,
        "installment_price": "19.90",
        "sku": "MGU-006",
        "rating": "5.0",
        "review_count": 215,
        "description": "God of War: Ragnarok para PS5 em mídia física, disco em ótimo estado.",
        "details": [
            {"label": "Plataforma", "value": "PlayStation 5"},
            {"label": "Gênero", "value": "Ação / Aventura"},
            {"label": "Condição", "value": "Usado"},
        ],
    },
    {
        "external_id": 7,
        "name": "Marvel's Spider-Man 2 - PS5",
        "slug": "spider-man-2-ps5",
        "image_path": "spider-man.jpg",
        "gallery_images": ["/images/spider-man.jpg"],
        "old_price": "349.00",
        "price": "249.00",
        "pix_price": "236.00",
        "platform": "PS5",
        "category": "jogo",
        "condition": "Seminovo",
        "in_stock": True,
        "stock": 10,
        "installments": 10,
        "installment_price": "24.90",
        "sku": "MGU-007",
        "rating": "4.9",
        "review_count": 187,
        "description": "Marvel's Spider-Man 2 para PS5, seminovo em estado impecável.",
        "details": [
            {"label": "Plataforma", "value": "PlayStation 5"},
            {"label": "Gênero", "value": "Ação / Mundo Aberto"},
            {"label": "Condição", "value": "Seminovo"},
        ],
    },
    {
        "external_id": 8,
        "name": "The Legend of Zelda: Tears of the Kingdom",
        "slug": "zelda-tears-of-the-kingdom",
        "image_path": "zelda.jpg",
        "gallery_images": ["/images/zelda.jpg"],
        "old_price": "349.00",
        "price": "259.00",
        "pix_price": "246.00",
        "platform": "Nintendo",
        "category": "jogo",
        "condition": "Usado",
        "in_stock": True,
        "stock": 9,
        "installments": 10,
        "installment_price": "25.90",
        "sku": "MGU-008",
        "rating": "5.0",
        "review_count": 302,
        "description": "Zelda TOTK para Nintendo Switch, usado em ótimo estado.",
        "details": [
            {"label": "Plataforma", "value": "Nintendo Switch"},
            {"label": "Gênero", "value": "Aventura / RPG"},
            {"label": "Condição", "value": "Usado"},
        ],
    },
    {
        "external_id": 9,
        "name": "FIFA 24 - PS4/PS5",
        "slug": "fifa-24-ps5",
        "image_path": "fifa.jpg",
        "gallery_images": ["/images/fifa.jpg"],
        "old_price": "299.00",
        "price": "179.00",
        "pix_price": "170.00",
        "platform": "PS5",
        "category": "jogo",
        "condition": "Usado",
        "in_stock": True,
        "stock": 15,
        "installments": 10,
        "installment_price": "17.90",
        "sku": "MGU-009",
        "rating": "4.5",
        "review_count": 98,
        "description": "FIFA 24 edição dupla PS4/PS5 em mídia física, bom estado.",
        "details": [
            {"label": "Plataforma", "value": "PS4 / PS5"},
            {"label": "Gênero", "value": "Esporte / Futebol"},
            {"label": "Condição", "value": "Usado"},
        ],
    },
    {
        "external_id": 10,
        "name": "Mortal Kombat 11 Ultimate - PS4",
        "slug": "mortal-kombat-11-ps4",
        "image_path": "mk11.jpg",
        "gallery_images": ["/images/mk11.jpg"],
        "old_price": "249.00",
        "price": "129.00",
        "pix_price": "122.00",
        "platform": "PS4",
        "category": "jogo",
        "condition": "Usado",
        "in_stock": True,
        "stock": 11,
        "installments": 10,
        "installment_price": "12.90",
        "sku": "MGU-010",
        "rating": "4.7",
        "review_count": 63,
        "description": "Mortal Kombat 11 Ultimate para PS4, edição definitiva em mídia física.",
        "details": [
            {"label": "Plataforma", "value": "PlayStation 4"},
            {"label": "Gênero", "value": "Luta"},
            {"label": "Condição", "value": "Usado"},
        ],
    },
]


class Command(BaseCommand):
    help = "Popula o banco com os produtos mockados atuais do frontend."

    def handle(self, *args, **options):
        backend_dir = Path(__file__).resolve().parents[4]  # eco-play/backend/
        frontend_images_dir = backend_dir.parent / "frontend" / "public" / "images"
        created = 0
        updated = 0

        with transaction.atomic():
            for item in SEED_PRODUCTS:
                defaults = {
                    "external_id": item["external_id"],
                    "name": item["name"],
                    "description": item["description"],
                    "platform": item["platform"],
                    "category": item["category"],
                    "condition": item["condition"],
                    "price": Decimal(item["price"]),
                    "old_price": Decimal(item["old_price"]),
                    "pix_price": Decimal(item["pix_price"]),
                    "stock": item["stock"],
                    "in_stock": item["in_stock"],
                    "installments": item["installments"],
                    "installment_price": Decimal(item["installment_price"]),
                    "sku": item["sku"],
                    "rating": Decimal(item["rating"]),
                    "review_count": item["review_count"],
                    "details": item["details"],
                    "gallery_images": item["gallery_images"],
                    "is_active": True,
                }
                product, was_created = Product.objects.update_or_create(
                    slug=item["slug"],
                    defaults=defaults,
                )

                image_path = frontend_images_dir / item["image_path"]
                if image_path.exists():
                    with image_path.open("rb") as fp:
                        product.image.save(item["image_path"], File(fp), save=True)

                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed concluído: {created} criados, {updated} atualizados."
            )
        )
