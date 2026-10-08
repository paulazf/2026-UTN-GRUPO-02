from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token

from ..serializers.owner import OwnerSerializer

class OwnerRegisterView(views.APIView):
    permission_classes = [AllowAny] # Cualquier persona puede registrarse

    def post(self, request):
        serializer = OwnerSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Generar token de autenticación para que quede logueado automáticamente
            token, _ = Token.objects.get_or_create(user=user)
            
            # Formato de respuesta con el token y datos
            return Response({
                "token": token.key,
                "owner": OwnerSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
