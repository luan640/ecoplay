from django.contrib.auth import login as django_login, logout as django_logout
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import User, UserType
from .serializers import (
    ClienteCheckoutRegisterSerializer,
    ClienteForgotPasswordSerializer,
    ClienteLoginSerializer,
    ClienteSerializer,
)


class ClienteViewSet(ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [AllowAny]  # TODO: proteger com autenticação/admin

    def get_queryset(self):
        return User.objects.filter(user_type=UserType.CLIENTE).order_by("-id")


class ClienteCheckoutRegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClienteCheckoutRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        django_login(
            request,
            user,
            backend="django.contrib.auth.backends.ModelBackend",
        )
        return Response(
            {
                "message": "Conta criada com sucesso.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "user_type": user.user_type,
                },
            },
            status=201,
        )


class ClienteLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClienteLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        django_login(request, user)
        return Response(
            {
                "message": "Login realizado com sucesso.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "user_type": user.user_type,
                },
            }
        )


class ClienteForgotPasswordView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClienteForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        exists = User.objects.filter(email=email).exists()
        return Response(
            {
                "message": "Se o e-mail existir, enviaremos instruções de recuperação.",
                "email": email,
                "exists": exists,  # mock: útil no desenvolvimento
            }
        )


class ClienteEmailCheckView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        email = (request.query_params.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Informe o e-mail."}, status=400)
        exists = User.objects.filter(email=email).exists()
        return Response({"email": email, "exists": exists})


class ClienteMeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"authenticated": False}, status=401)
        return Response(
            {
                "authenticated": True,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "phone": user.phone,
                    "cpf": user.cpf or "",
                    "birth_date": str(user.birth_date) if user.birth_date else "",
                    "user_type": user.user_type,
                    "address_postal_code": user.address_postal_code,
                    "address_street": user.address_street,
                    "address_number": user.address_number,
                    "address_complement": user.address_complement,
                    "address_reference": user.address_reference,
                    "address_district": user.address_district,
                    "address_city": user.address_city,
                    "address_state": user.address_state,
                    "address_country": user.address_country,
                    "address_city_ibge": user.address_city_ibge,
                },
            }
        )

    def patch(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"authenticated": False}, status=401)

        editable_fields = {
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
        }
        payload = {k: v for k, v in request.data.items() if k in editable_fields}
        serializer = ClienteSerializer(user, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "message": "Dados de endereço atualizados.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "user_type": user.user_type,
                    "address_postal_code": user.address_postal_code,
                    "address_street": user.address_street,
                    "address_number": user.address_number,
                    "address_complement": user.address_complement,
                    "address_reference": user.address_reference,
                    "address_district": user.address_district,
                    "address_city": user.address_city,
                    "address_state": user.address_state,
                    "address_country": user.address_country,
                    "address_city_ibge": user.address_city_ibge,
                },
            }
        )


class ClienteLogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        django_logout(request)
        return Response({"message": "Logout realizado com sucesso."})


class AdminLoginView(APIView):
    """Login exclusivo para usuários ADMIN (dono da loja)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from .serializers import ClienteLoginSerializer

        serializer = ClienteLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        if user.user_type != UserType.ADMIN:
            return Response(
                {"detail": "Acesso restrito ao administrador."},
                status=403,
            )

        django_login(request, user)
        return Response(
            {
                "message": "Login de administrador realizado com sucesso.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "user_type": user.user_type,
                },
            }
        )
