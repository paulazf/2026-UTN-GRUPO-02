from rest_framework import viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from api.models import MedicalTest
from api.serializers.medical_test import MedicalTestSerializer, active_pets


class MedicalTestViewSet(viewsets.ModelViewSet):
    """
    TDD-0010 Alta        POST   /api/v1/medical-test/
    TDD-0011 Consulta    GET    /api/v1/medical-test/?idPet=&status=
                         GET    /api/v1/medical-test/{id}/
    TDD-0012 Modificación PATCH /api/v1/medical-test/{id}/
    TDD-0013 Baja lógica DELETE /api/v1/medical-test/{id}/
    """

    serializer_class = MedicalTestSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        pets = active_pets(self.request)
        queryset = MedicalTest.objects.select_related("pet").prefetch_related("files").filter(
            isDeleted=False, pet__in=pets
        )

        # Los filtros solo aplican al listado.
        if self.action == "list":
            id_pet = self.request.query_params.get("idPet")
            if id_pet is not None:
                if not id_pet.isdigit():
                    raise ValidationError({"idPet": ["Debe ser un número."]})
                if not pets.filter(pk=int(id_pet)).exists():
                    raise NotFound("Mascota no encontrada.")
                queryset = queryset.filter(pet_id=int(id_pet))

            status = self.request.query_params.get("status")
            if status is not None:
                if status not in MedicalTest.Status.values:
                    raise ValidationError(
                        {"status": [f"Valores permitidos: {', '.join(MedicalTest.Status.values)}."]}
                    )
                queryset = queryset.filter(status=status)

        return queryset.order_by("-date", "-idMedicalTest")

    def perform_destroy(self, instance):
        # Baja lógica: el registro y el archivo se conservan.
        instance.isDeleted = True
        instance.save(update_fields=["isDeleted"])
