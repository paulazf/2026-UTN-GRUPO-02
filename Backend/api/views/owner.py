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
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "owner": OwnerSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OwnerProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Obtener perfil propio"""
        return Response(OwnerSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        """Actualizar perfil (firstName, lastName, phone)"""
        serializer = OwnerUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(OwnerSerializer(request.user).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Baja Lógica de cuenta (TDD-0003)"""
        user = request.user
        user.isDeleted = True
        # Liberar email para que pueda volver a usarse
        user.email = f"deleted_{uuid.uuid4().hex[:8]}_{user.email}"
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
