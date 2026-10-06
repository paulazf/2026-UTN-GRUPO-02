from rest_framework import status, viewsets
from rest_framework.response import Response

from api.models import Medication
from api.serializers import MedicationSerializer


class MedicationViewSet(viewsets.ModelViewSet):
    """
    API endpoint para el CRUD del catálogo de medicamentos.
    Implementa:
    - Alta (POST /api/v1/medications/)
    - Modificación (PUT / PATCH /api/v1/medications/{id}/)
    - Baja lógica (DELETE /api/v1/medications/{id}/)
    - Listado de medicamentos activos (GET /api/v1/medications/)
    - Detalle de medicamento activo (GET /api/v1/medications/{id}/)
    """
    serializer_class = MedicationSerializer

    def get_queryset(self):
        queryset = Medication.objects.filter(isDeleted=False)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)  
        return queryset

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        try:
            instance = Medication.objects.get(pk=pk)
        except Medication.DoesNotExist:
            return Response(
                {"detail": "No se encontró el medicamento especificado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if instance.isDeleted:
            return Response(
                {"detail": "El medicamento ya ha sido dado de baja previamente."},
                status=status.HTTP_404_NOT_FOUND,
            )

        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])

        return Response(
            {
                "message": "El medicamento fue dado de baja correctamente del catálogo.",
                "idMedication": instance.pk,
                "isDeleted": True,
            },
            status=status.HTTP_200_OK,
        )