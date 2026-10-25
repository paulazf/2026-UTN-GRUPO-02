from datetime import date, timedelta

from django.conf import settings
from django.db.models import Exists, OuterRef
from rest_framework import viewsets
from rest_framework.exceptions import NotFound, ValidationError

from api.models import VaccinePet, VaccineType
from api.serializers.medical_test import active_pets
from api.serializers.vaccine_pet import VaccinePetSerializer

STATUS_VALUES = ["VALID", "EXPIRING", "EXPIRED"]


class VaccinePetViewSet(viewsets.ModelViewSet):
    """
    API endpoint para las vacunas y antiparasitarios aplicados a mascotas.
    - Alta (POST /api/v1/vaccine-pets/)                                      TDD-0028
    - Listado (GET /api/v1/vaccine-pets/?idPet=&latest=&status=&type=)      TDD-0029
    - Detalle (GET /api/v1/vaccine-pets/{id}/)                              TDD-0029
    - Modificación (PUT / PATCH /api/v1/vaccine-pets/{id}/)                 TDD-0030
    - Baja lógica (DELETE /api/v1/vaccine-pets/{id}/)                       TDD-0031
    """

    serializer_class = VaccinePetSerializer

    def get_queryset(self):
        pets = active_pets(self.request)

        # Una aplicación está "renovada" si hay otra posterior del mismo producto para la misma mascota.
        newer = VaccinePet.objects.filter(
            pet=OuterRef("pet"),
            vaccine=OuterRef("vaccine"),
            isDeleted=False,
            applicationDate__gt=OuterRef("applicationDate"),
        )
        queryset = (
            VaccinePet.objects.select_related("pet", "vaccine")
            .filter(isDeleted=False, pet__in=pets)
            .annotate(hasNewer=Exists(newer))
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

            latest = params.get("latest")
            if latest is not None and latest not in ("true", "false"):
                raise ValidationError({"latest": ["Valores permitidos: true, false."]})

            status = params.get("status")
            if status is not None:
                if status not in STATUS_VALUES:
                    raise ValidationError({"status": [f"Valores permitidos: {', '.join(STATUS_VALUES)}."]})
                today = date.today()
                limit = today + timedelta(days=settings.VACCINE_EXPIRING_DAYS)
                if status == "EXPIRED":
                    queryset = queryset.filter(expirationDate__lt=today)
                elif status == "EXPIRING":
                    queryset = queryset.filter(expirationDate__gte=today, expirationDate__lte=limit)
                else:
                    queryset = queryset.filter(expirationDate__gt=limit)

            # status implica quedarse con la última aplicación de cada producto
            if latest == "true" or status is not None:
                queryset = queryset.filter(hasNewer=False)

            vaccine_type = params.get("type")
            if vaccine_type is not None:
                if vaccine_type not in VaccineType.values:
                    raise ValidationError({"type": [f"Valores permitidos: {', '.join(VaccineType.values)}."]})
                queryset = queryset.filter(vaccine__type=vaccine_type)

        return queryset.order_by("-applicationDate", "-idVaccinePet")

    def perform_destroy(self, instance):
        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])
