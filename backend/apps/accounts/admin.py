from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("id", "email", "full_name", "cpf", "user_type", "is_active")
    list_filter = ("user_type", "is_active", "is_staff", "is_superuser")
    search_fields = ("email", "full_name", "cpf", "username")
    ordering = ("-id",)

    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "Dados adicionais",
            {
                "fields": (
                    "full_name",
                    "cpf",
                    "birth_date",
                    "phone",
                    "user_type",
                )
            },
        ),
    )

    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        (
            "Dados adicionais",
            {
                "fields": (
                    "email",
                    "full_name",
                    "cpf",
                    "birth_date",
                    "phone",
                    "user_type",
                )
            },
        ),
    )
