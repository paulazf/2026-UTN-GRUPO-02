from rest_framework import viewsets

from api.models import Breed
from api.serializers import BreedSerializer


class BreedViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint para consultar razas de mascotas.
    GET /api/v1/breeds/?species=DOG
    GET /api/v1/breeds/?species=CAT
    """
    serializer_class = BreedSerializer
    queryset = Breed.objects.all()

    def get_queryset(self):
        queryset = Breed.objects.all()
        species = self.request.query_params.get("species")
        if species:
            queryset = queryset.filter(species__iexact=species)
        return queryset
