from rest_framework.permissions import BasePermission

from .models import UserType


class IsAdminUser(BasePermission):
    """Permite acesso apenas a usuários autenticados com user_type == ADMIN."""

    message = "Acesso restrito ao administrador."

    def has_permission(self, request, view):
        is_auth = request.user is not None and request.user.is_authenticated
        user_type = getattr(request.user, 'user_type', '???') if is_auth else 'anonymous'
        # Temporary debug log – remove after issue is resolved
        print(
            f"[IsAdminUser] view={view.__class__.__name__} "
            f"method={request.method} "
            f"user={getattr(request.user, 'email', request.user)} "
            f"is_auth={is_auth} "
            f"user_type={user_type}"
        )
        return (
            is_auth
            and request.user.user_type == UserType.ADMIN
        )
