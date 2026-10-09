from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

from ..serializers.owner import OwnerSerializer

class LoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Debe proporcionar email y contraseña."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Autentica usando el email como username
        user = authenticate(request, username=email.lower(), password=password)

        if not user:
            return Response(
                {"error": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not hasattr(user, 'owner_profile'):
            return Response(
                {"error": "Este usuario no tiene un perfil de Dueño."},
                status=status.HTTP_403_FORBIDDEN
            )

        if user.owner_profile.isDeleted:
            return Response(
                {"error": "Esta cuenta ha sido eliminada. Comuníquese con soporte."},
                status=status.HTTP_403_FORBIDDEN
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "owner": OwnerSerializer(user.owner_profile).data
        }, status=status.HTTP_200_OK)

class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Borramos el token activo de la base de datos para cerrar sesión
            request.user.auth_token.delete()
            return Response({"detail": "Sesión cerrada exitosamente."}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {"error": "Algo salió mal al cerrar la sesión."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
