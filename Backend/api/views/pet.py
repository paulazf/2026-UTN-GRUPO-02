from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from api.models import Pet
from api.serializers import PetSerializer


class PetViewSet(viewsets.ModelViewSet):
    """
    API endpoint para el CRUD de mascotas.
    Implementa:
    - Alta (POST /api/v1/pets/)
    - Modificación (PUT / PATCH /api/v1/pets/{id}/)
    - Baja lógica (DELETE /api/v1/pets/{id}/)
    - Listado de mascotas activas (GET /api/v1/pets/)
    - Detalle de mascota activa (GET /api/v1/pets/{id}/)
    """
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    serializer_class = PetSerializer

    def get_queryset(self):
        queryset = Pet.objects.filter(isDeleted=False).select_related("breed")
        if hasattr(self.request.user, 'owner_profile'):
            queryset = queryset.filter(idOwner=self.request.user.owner_profile.idOwner)
        return queryset

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'owner_profile'):
            serializer.save(idOwner=self.request.user.owner_profile.idOwner)
        else:
            serializer.save()

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        try:
            instance = Pet.objects.get(pk=pk)
        except Pet.DoesNotExist:
            return Response(
                {"detail": "No se encontró la mascota especificada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if instance.isDeleted:
            return Response(
                {"detail": "La mascota ya ha sido dada de baja previamente."},
                status=status.HTTP_404_NOT_FOUND,
            )

        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])

        return Response(
            {
                "message": "La mascota fue dada de baja correctamente.",
                "id": instance.id,
                "isDeleted": True,
            },
            status=status.HTTP_200_OK,
        )

