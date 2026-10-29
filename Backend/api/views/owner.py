from django.db import transaction
from rest_framework import status, views
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
import uuid

from ..serializers.owner import OwnerSerializer, OwnerUpdateSerializer, ChangePasswordSerializer

class OwnerRegisterView(views.APIView):
    permission_classes = [AllowAny] # Cualquier persona puede registrarse

    def post(self, request):
        serializer = OwnerSerializer(data=request.data)
        if serializer.is_valid():
            owner = serializer.save()
            token, _ = Token.objects.get_or_create(user=owner.user)
            return Response({
                "token": token.key,
                "owner": OwnerSerializer(owner).data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def sync_user_names(user, owner):
    """Copia nombre y apellido del Owner al User de Django."""
    user.first_name = (owner.firstName or "")[:150]
    user.last_name = (owner.lastName or "")[:150]
    user.save(update_fields=["first_name", "last_name"])


class OwnerProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get_owner(self):
        """Único lugar donde se obtiene y valida el perfil del usuario autenticado."""
        owner = getattr(self.request.user, "owner_profile", None)
        if owner is None or owner.isDeleted:
            raise NotFound("Perfil no encontrado.")
        return owner

    def get(self, request):
        """Obtener perfil propio"""
        return Response(OwnerSerializer(self.get_owner()).data, status=status.HTTP_200_OK)

    @transaction.atomic
    def patch(self, request):
        """Actualizar perfil (firstName, lastName, phone)"""
        owner = self.get_owner()
        serializer = OwnerUpdateSerializer(owner, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            sync_user_names(request.user, owner)
            return Response(OwnerSerializer(owner).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request):
        """Baja Lógica de cuenta (TDD-0003)"""
        owner = self.get_owner()
        user = request.user

        owner.isDeleted = True

        # Liberar email para que pueda volver a usarse
        new_email = f"deleted_{uuid.uuid4().hex[:8]}_{owner.email}"
        owner.email = new_email
        owner.save(update_fields=["isDeleted", "email", "updated_at"])

        user.username = new_email
        user.email = new_email
        user.is_active = False
        user.save(update_fields=["username", "email", "is_active"])

        # Cerrar sesión
        Token.objects.filter(user=user).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class OwnerPasswordView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Cambio de contraseña (TDD-0002)"""
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['newPassword'])
            user.save()

            # Invalidar token viejo y generar nuevo
            Token.objects.filter(user=user).delete()
            token, _ = Token.objects.get_or_create(user=user)

            return Response({"detail": "Contraseña actualizada exitosamente.", "token": token.key}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
