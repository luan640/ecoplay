from django.contrib.auth.models import AbstractUser
from django.db import models


class UserType(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    CLIENTE = "CLIENTE", "Cliente"


class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField("nome", max_length=255)
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True)
    birth_date = models.DateField("data de nascimento", null=True, blank=True)
    phone = models.CharField("celular", max_length=20, blank=True, default="")
    address_postal_code = models.CharField("CEP", max_length=9, blank=True, default="")
    address_street = models.CharField("endereço", max_length=255, blank=True, default="")
    address_number = models.CharField("número", max_length=30, blank=True, default="")
    address_complement = models.CharField("complemento", max_length=120, blank=True, default="")
    address_reference = models.CharField("referência", max_length=120, blank=True, default="")
    address_district = models.CharField("bairro", max_length=120, blank=True, default="")
    address_city = models.CharField("cidade", max_length=120, blank=True, default="")
    address_state = models.CharField("estado", max_length=120, blank=True, default="")
    address_country = models.CharField("país", max_length=3, blank=True, default="BRA")
    address_city_ibge = models.PositiveIntegerField("ibge cidade", null=True, blank=True)
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.CLIENTE,
    )

    class Meta:
        db_table = "users"
        verbose_name = "usuário"
        verbose_name_plural = "usuários"

    def __str__(self) -> str:
        return self.email or self.username

    def save(self, *args, **kwargs):
        # Garante que superusers sempre têm user_type ADMIN
        if self.is_superuser:
            self.user_type = UserType.ADMIN
        super().save(*args, **kwargs)
