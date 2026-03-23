import re
import uuid

from rest_framework import serializers
from django.contrib.auth import authenticate

from .models import User, UserType


CPF_REGEX = re.compile(r"^\d{11}$")


class ClienteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "cpf",
            "birth_date",
            "phone",
            "address_postal_code",
            "address_street",
            "address_number",
            "address_complement",
            "address_reference",
            "address_district",
            "address_city",
            "address_state",
            "address_country",
            "address_city_ibge",
            "password",
            "user_type",
            "created_at",
        ]
        read_only_fields = ["id", "user_type", "created_at"]

    created_at = serializers.DateTimeField(source="date_joined", read_only=True)

    def validate_cpf(self, value: str) -> str:
        digits = re.sub(r"\D", "", value or "")
        if not CPF_REGEX.match(digits):
            raise serializers.ValidationError("CPF deve conter 11 dígitos.")
        return digits

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def _generate_username(self, email: str) -> str:
        base = (email.split("@")[0] or "cliente").strip().lower()
        base = re.sub(r"[^a-z0-9._-]+", "", base) or "cliente"
        candidate = base[:100]
        if not User.objects.filter(username=candidate).exists():
            return candidate
        return f"{base[:80]}-{uuid.uuid4().hex[:8]}"

    def create(self, validated_data):
        password = validated_data.pop("password", "")
        email = validated_data["email"]
        validated_data["user_type"] = UserType.CLIENTE
        validated_data.setdefault("username", self._generate_username(email))

        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        validated_data.pop("user_type", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password is not None:
            if password == "":
                instance.set_unusable_password()
            else:
                instance.set_password(password)

        instance.save()
        return instance


class ClienteCheckoutRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value: str) -> str:
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("E-mail já cadastrado.")
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        user = User(
            username=ClienteSerializer()._generate_username(email),
            email=email,
            full_name=validated_data["full_name"].strip(),
            user_type=UserType.CLIENTE,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class ClienteLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]
        user = User.objects.filter(email=email).first()
        if not user:
            raise serializers.ValidationError("Credenciais inválidas.")
        if not user.has_usable_password():
            raise serializers.ValidationError("Esta conta não possui senha cadastrada.")
        auth_user = authenticate(username=user.username, password=password)
        if not auth_user:
            raise serializers.ValidationError("Credenciais inválidas.")
        attrs["user"] = auth_user
        return attrs


class ClienteForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return value.strip().lower()
