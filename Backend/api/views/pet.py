from rest_framework import status, viewsets
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
    serializer_class = PetSerializer

    def get_queryset(self):
        queryset = Pet.objects.filter(isDeleted=False).select_related("breed")
        owner_id = self.request.query_params.get("idOwner") or self.request.query_params.get("owner")
        if owner_id:
            queryset = queryset.filter(idOwner=owner_id)
        return queryset

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
