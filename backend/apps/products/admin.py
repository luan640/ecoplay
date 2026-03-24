from django.contrib import admin

from .models import Product, QuoteProduct, Coupon, Review


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "platform", "price", "stock", "is_active")
    list_filter = ("is_active", "platform", "category")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(QuoteProduct)
class QuoteProductAdmin(admin.ModelAdmin):
    list_display = ("external_id", "name", "sku", "image_exists")
    search_fields = ("name", "sku", "external_id")
    list_filter = ("image_exists",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "user", "rating", "verified_purchase", "created_at")
    list_filter = ("rating", "verified_purchase")
    search_fields = ("product__name", "user__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "discount_type",
        "value",
        "is_active",
        "usage_limit",
        "usage_limit_per_user",
        "used_count",
    )
    search_fields = ("code",)
    list_filter = ("discount_type", "is_active")
