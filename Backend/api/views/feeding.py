from rest_framework import viewsets
from rest_framework.exceptions import NotFound, ValidationError

from api.models import Feeding, FeedingType
from api.serializers.feeding import FeedingSerializer
from api.serializers.medical_test import active_pets


class FeedingViewSet(viewsets.ModelViewSet):
    """
    API endpoint para la gestión de alimentación de mascotas.
    - Alta (POST /api/v1/feedings/)                            
    - Listado (GET /api/v1/feedings/?idPet=&type=)           
    - Detalle (GET /api/v1/feedings/{id}/)                     
    - Modificación (PUT / PATCH /api/v1/feedings/{id}/)      
    - Baja lógica (DELETE /api/v1/feedings/{id}/)            
    """

    serializer_class = FeedingSerializer

    def get_queryset(self):
        pets = active_pets(self.request)
        queryset = (
            Feeding.objects.select_related("pet")
            .filter(isDeleted=False, pet__in=pets)
        )

        if self.action == "list":
            params = self.request.query_params

            id_pet = params.get("idPet")
            if id_pet is not None:
                if not id_pet.isdigit():
                    raise ValidationError({"idPet": ["Debe ser un número entero."]})
                if not pets.filter(pk=int(id_pet)).exists():
                    raise NotFound("Mascota no encontrada.")
                queryset = queryset.filter(pet_id=int(id_pet))

            feeding_type = params.get("type")
            if feeding_type is not None:
                if feeding_type not in FeedingType.values:
                    raise ValidationError(
                        {"type": [f"Valores permitidos: {', '.join(FeedingType.values)}."]}
                    )
                queryset = queryset.filter(type=feeding_type)

        return queryset.order_by("-sinceDate", "-idFeeding")

    def perform_destroy(self, instance):
        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])

