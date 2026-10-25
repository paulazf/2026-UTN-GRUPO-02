from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from api.models.address import Address
from api.serializers.address import AddressSerializer


class AddressViewSet(viewsets.ModelViewSet):
    """
    Gestión de domicilios del usuario (TDD-0033).
    - Listado: GET /api/v1/addresses/
    - Alta: POST /api/v1/addresses/
    - Detalle: GET /api/v1/addresses/{id}/
    - Baja lógica: DELETE /api/v1/addresses/{id}/
    """
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        owner = getattr(user, "owner_profile", None)
        if not owner:
            return Address.objects.none()
        return (
            Address.objects.select_related("city", "city__province")
            .filter(owner=owner, isDeleted=False)
            .order_by("referenceName", "-idAddress")
        )

    def perform_create(self, serializer):
        owner = getattr(self.request.user, "owner_profile", None)
        serializer.save(owner=owner)

    def perform_destroy(self, instance):
        instance.isDeleted = True
        instance.save(update_fields=["isDeleted", "updated_at"])

