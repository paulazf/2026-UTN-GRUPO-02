from rest_framework import status, viewsets
from rest_framework.response import Response

from api.models import Disease
from api.serializers import DiseaseSerializer


class DiseaseViewSet(viewsets.ModelViewSet):
    """
    API endpoint para el catálogo de enfermedades (Disease).
    Implementa:
    - Alta (POST /api/v1/diseases/)
    - Modificación (PUT / PATCH /api/v1/diseases/{id}/)
    - Baja lógica (DELETE /api/v1/diseases/{id}/) -> 204 No Content
    - Listado de enfermedades activas (GET /api/v1/diseases/)
    - Detalle de enfermedad activa (GET /api/v1/diseases/{id}/)
    """
    serializer_class = DiseaseSerializer

    def get_queryset(self):
        queryset = Disease.objects.filter(isDeleted=False)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        try:
            instance = Disease.objects.get(pk=pk)
        except Disease.DoesNotExist:
            return Response(
                {"detail": "No se encontró la enfermedad especificada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if instance.isDeleted:
            return Response(
                {"detail": "La enfermedad ya ha sido dada de baja previamente."},
                status=status.HTTP_404_NOT_FOUND,
            )

        instance.isDeleted = True
        instance.save(update_fields=["isDeleted"])

        return Response(status=status.HTTP_204_NO_CONTENT)
