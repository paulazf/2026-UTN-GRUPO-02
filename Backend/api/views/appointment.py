from rest_framework import viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated

from api.models.appointment import Appointment
from api.serializers.appointment import AppointmentSerializer
from api.serializers.medical_test import active_pets


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    CRUD de Turnos veterinarios (TDD-0034, TDD-0035, TDD-0036, TDD-0037).
    - Alta: POST /api/v1/appointments/
    - Listado por mascota: GET /api/v1/appointments/?idPet=
    - Detalle: GET /api/v1/appointments/{id}/
    - Modificación: PUT/PATCH /api/v1/appointments/{id}/
    - Baja lógica: DELETE /api/v1/appointments/{id}/
    """
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        pets = active_pets(self.request)
        queryset = Appointment.objects.select_related(
            "pet", "address", "address__city", "address__city__province"
        ).filter(isDeleted=False, pet__in=pets)

        if self.action == "list":
            id_pet = self.request.query_params.get("idPet")
            if id_pet is not None:
                if not str(id_pet).isdigit():
                    raise ValidationError({"idPet": ["Debe ser un número entero."]})
                if not pets.filter(pk=int(id_pet)).exists():
                    raise NotFound("Mascota no encontrada.")
                queryset = queryset.filter(pet_id=int(id_pet))

        return queryset.order_by("-date", "-time", "-idAppointment")

    def perform_destroy(self, instance):
        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])

