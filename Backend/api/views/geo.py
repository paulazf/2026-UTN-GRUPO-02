from rest_framework import viewsets, filters
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.permissions import IsAuthenticated

from api.models.province import Province
from api.models.city import City
from api.serializers.geo import ProvinceSerializer, CitySerializer


class ProvinceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de provincias argentinas (TDD-0032).
    - GET /api/v1/provinces/
    - GET /api/v1/provinces/{id}/
    """
    queryset = Province.objects.all().order_by("name")
    serializer_class = ProvinceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de ciudades filtradas obligatoriamente por provincia (TDD-0032).
    - GET /api/v1/cities/?idProvince={id}&search={term}
    """
    serializer_class = CitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        id_province = self.request.query_params.get("idProvince")

        # Si se consulta detalle directo por pk /cities/{id}/
        if self.action != "list":
            return City.objects.select_related("province").all()

        if id_province is None:
            raise ValidationError({"idProvince": ["El parámetro idProvince es obligatorio."]})

        if not str(id_province).isdigit():
            raise ValidationError({"idProvince": ["Debe ser un número entero."]})

        if not Province.objects.filter(pk=int(id_province)).exists():
            raise NotFound("Provincia no encontrada.")

        queryset = City.objects.select_related("province").filter(province_id=int(id_province))

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search.strip())

        return queryset.order_by("name")

