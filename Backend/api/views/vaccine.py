from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from api.models import PetSpecies, Vaccine, VaccineType
from api.serializers.vaccine import VaccineSerializer


class VaccineViewSet(viewsets.ModelViewSet):
    """
    API endpoint para el CRUD del catálogo de vacunas y antiparasitarios.
    - Alta (POST /api/v1/vaccines/)                          TDD-0025
    - Listado de activos (GET /api/v1/vaccines/?type=&species=&search=)
    - Detalle (GET /api/v1/vaccines/{id}/)
    - Modificación (PUT / PATCH /api/v1/vaccines/{id}/)      TDD-0026
    - Baja lógica (DELETE /api/v1/vaccines/{id}/)            TDD-0027
    """

    serializer_class = VaccineSerializer

    def get_queryset(self):
        queryset = Vaccine.objects.filter(isDeleted=False)

        if self.action == "list":
            vaccine_type = self.request.query_params.get("type")
            if vaccine_type:
                if vaccine_type not in VaccineType.values:
                    raise ValidationError({"type": [f"Valores permitidos: {', '.join(VaccineType.values)}."]})
                queryset = queryset.filter(type=vaccine_type)

            species = self.request.query_params.get("species")
            if species:
                if species not in PetSpecies.values:
                    raise ValidationError({"species": [f"Valores permitidos: {', '.join(PetSpecies.values)}."]})
                # los de esa especie y los que sirven para ambas
                queryset = queryset.filter(Q(species=species) | Q(species__isnull=True))

            search = self.request.query_params.get("search")
            if search:
                queryset = queryset.filter(Q(name__icontains=search) | Q(laboratory__icontains=search))

        return queryset.order_by("name", "laboratory")

    def perform_destroy(self, instance):
        # Baja lógica: las aplicaciones existentes conservan la referencia.
        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])
