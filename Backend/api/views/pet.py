import logging
from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from api.models import Pet
from api.serializers import PetSerializer
from api.services.pdf_generator import generate_medical_history_pdf

logger = logging.getLogger(__name__)


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

    @action(detail=True, methods=["get"], url_path="medical-history/pdf")
    def medical_history_pdf(self, request, pk=None):
        """
        Descarga la historia clínica y libreta sanitaria de la mascota en PDF (TDD-0048).
        Solo accesible por el tutor dueño de la mascota activa.
        """
        try:
            pet = self.get_queryset().get(pk=pk)
        except Pet.DoesNotExist:
            return Response(
                {"detail": "Mascota no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.warning("Error buscando mascota pk=%s: %s", pk, e)
            return Response(
                {"detail": "Identificador de mascota inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        owner = getattr(request.user, "owner_profile", None)
        if not owner and getattr(pet, "idOwner", None):
            from api.models import Owner
            owner = Owner.objects.filter(idOwner=pet.idOwner, isDeleted=False).first()

        try:
            pdf_buffer = generate_medical_history_pdf(pet, owner)
        except Exception as e:
            logger.exception("Error generando PDF de historia clínica para mascota pk=%s: %s", pk, e)
            return Response(
                {"detail": f"Error al generar el PDF de la libreta sanitaria: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        safe_pet_name = "".join(c for c in pet.name.lower() if c.isalnum() or c in ("-", "_")) or "mascota"
        filename = f"libreta_{safe_pet_name}.pdf"

        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )

