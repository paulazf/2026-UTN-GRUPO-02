from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction

from ..models.owner import Owner
from ..serializers.owner import OwnerSerializer
from ..services.google_auth import verify_google_id_token

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
            Token.objects.filter(user=request.user).delete()
            return Response({"detail": "Sesión cerrada exitosamente."}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {"error": "Algo salió mal al cerrar la sesión."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GoogleAuthView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = (request.data.get("idToken") or "").strip()
        if not token_str:
            return Response(
                {"detail": "Debe proporcionar el token de autenticación de Google (idToken)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        google_data = verify_google_id_token(token_str)
        email = (google_data.get("email") or "").strip().lower()
        first_name = (google_data.get("given_name") or "").strip() or "Usuario"
        last_name = (google_data.get("family_name") or "").strip() or "Google"

        if not email:
            return Response(
                {"detail": "La cuenta de Google no posee un correo electrónico asociado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_new_user = False

        with transaction.atomic():
            user = User.objects.filter(username=email).first()

            if user:
                if hasattr(user, 'owner_profile'):
                    if user.owner_profile.isDeleted:
                        return Response(
                            {"detail": "Esta cuenta ha sido eliminada. Comuníquese con soporte."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    owner = user.owner_profile
                    if owner.authProvider != 'google':
                        owner.authProvider = 'google'
                        owner.save(update_fields=['authProvider'])
                else:
                    owner = Owner.objects.create(
                        user=user,
                        email=email,
                        firstName=first_name,
                        lastName=last_name,
                        authProvider='google'
                    )
            else:
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name
                )
                user.set_unusable_password()
                user.save()

                owner = Owner.objects.create(
                    user=user,
                    email=email,
                    firstName=first_name,
                    lastName=last_name,
                    phone=None,
                    authProvider='google'
                )
                is_new_user = True

            token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "owner": OwnerSerializer(owner).data,
            "isNewUser": is_new_user
        }, status=status.HTTP_200_OK)
