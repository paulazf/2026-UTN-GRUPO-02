from rest_framework import status, views
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

class OwnerProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Obtener perfil propio"""
        if not hasattr(request.user, 'owner_profile'):
            return Response({"error": "Perfil no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        return Response(OwnerSerializer(request.user.owner_profile).data, status=status.HTTP_200_OK)

    def patch(self, request):
        """Actualizar perfil (firstName, lastName, phone)"""
        if not hasattr(request.user, 'owner_profile'):
            return Response({"error": "Perfil no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = OwnerUpdateSerializer(request.user.owner_profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(OwnerSerializer(request.user.owner_profile).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Baja Lógica de cuenta (TDD-0003)"""
        if not hasattr(request.user, 'owner_profile'):
            return Response({"error": "Perfil no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            
        user = request.user
        owner = user.owner_profile
        
        owner.isDeleted = True
        
        # Liberar email para que pueda volver a usarse
        new_email = f"deleted_{uuid.uuid4().hex[:8]}_{owner.email}"
        owner.email = new_email
        owner.save()
        
        # También liberar el email del usuario de Django y marcar como inactivo si quieren,
        # pero con borrar el token y modificar el owner alcanza.
        user.username = new_email
        user.email = new_email
        user.is_active = False # Evita que se loguee
        user.save()
        
        # Cerrar sesión
        if hasattr(user, 'auth_token'):
            user.auth_token.delete()
            
        return Response(status=status.HTTP_204_NO_CONTENT)

class OwnerPasswordView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Cambio de contraseña (TDD-0002)"""
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['currentPassword']):
                return Response({"error": "La contraseña actual es incorrecta."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['newPassword'])
            user.save()

            # Invalidar token viejo y generar nuevo
            if hasattr(user, 'auth_token'):
                user.auth_token.delete()
            token, _ = Token.objects.get_or_create(user=user)

            return Response({"detail": "Contraseña actualizada exitosamente.", "token": token.key}, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
