from django.contrib import admin

from .models import (
    QuoteRequest,
    QuoteRequestItem,
    QuoteRequestItemPhoto,
    Sale,
    SaleItem,
)


class QuoteRequestItemPhotoInline(admin.TabularInline):
    model = QuoteRequestItemPhoto
    extra = 0
    readonly_fields = ("created_at",)


class QuoteRequestItemInline(admin.StackedInline):
    model = QuoteRequestItem
    extra = 0
    readonly_fields = ("created_at",)
    inlines = []


@admin.register(QuoteRequest)
class QuoteRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "public_id", "full_name", "email", "city", "created_at")
    search_fields = ("public_id", "full_name", "email", "city")
    readonly_fields = ("public_id", "created_at", "updated_at")
    inlines = [QuoteRequestItemInline]


@admin.register(QuoteRequestItem)
class QuoteRequestItemAdmin(admin.ModelAdmin):
    list_display = ("id", "quote_request", "product_name", "quantity", "mode", "quality_level")
    search_fields = ("product_name", "sku", "quote_request__public_id")
    list_filter = ("mode", "quality_level")
    readonly_fields = ("created_at",)
    inlines = [QuoteRequestItemPhotoInline]


@admin.register(QuoteRequestItemPhoto)
class QuoteRequestItemPhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "item", "original_name", "created_at")
    search_fields = ("item__product_name", "item__quote_request__public_id", "original_name")
    readonly_fields = ("created_at",)


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "public_id",
        "customer_name",
        "customer_email",
        "status",
        "payment_method",
        "total_amount",
        "created_at",
    )
    search_fields = ("public_id", "customer_name", "customer_email", "coupon_code")
    list_filter = ("status", "payment_method")
    readonly_fields = ("public_id", "created_at", "updated_at")
    inlines = [SaleItemInline]


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ("id", "sale", "product_name", "quantity", "unit_price", "total_price")
    search_fields = ("product_name", "sale__public_id", "sale__customer_name")
    readonly_fields = ("created_at",)
