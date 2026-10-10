from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from api.models import MedicationPet
from api.serializers.medical_test import active_pets
from api.serializers.medication_pet import MedicationPetSerializer


class MedicationPetViewSet(viewsets.ModelViewSet):
    """
    API endpoint para el CRUD de medicamentos asignados a mascotas.
    - Alta (POST /api/v1/medication-pets/)
    - Modificación (PUT/PATCH /api/v1/medication-pets/{id}/)
    - Baja lógica (DELETE /api/v1/medication-pets/{id}/)
    - Listado de medicamentos asignados a mascotas (GET /api/v1/medication-pets/?idPet=) 
    - Detalle de medicamento asignado a mascota(GET /api/v1/medication-pets/{id}/)
    """

    serializer_class = MedicationPetSerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        pets = active_pets(self.request)
        queryset = MedicationPet.objects.select_related("pet", "medication").filter(
            isDeleted=False, pet__in=pets
        )

        if self.action == "list":
            id_pet = self.request.query_params.get("idPet")
            if id_pet is None:
                raise ValidationError({"idPet": ["El parámetro idPet es obligatorio."]})
            if not id_pet.isdigit():
                raise ValidationError({"idPet": ["Debe ser un número entero."]})
            if not pets.filter(pk=int(id_pet)).exists():
                raise NotFound("Mascota no encontrada.")
            queryset = queryset.filter(pet_id=int(id_pet))

        return queryset.order_by("-startDate", "-id")

    def perform_destroy(self, instance):
        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])

