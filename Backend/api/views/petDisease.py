from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from api.models.petDisease import PetDisease
from api.serializers.petDisease import PetDiseaseSerializer


class PetDiseaseViewSet(viewsets.ModelViewSet):
    serializer_class = PetDiseaseSerializer

    def get_queryset(self):
        queryset = PetDisease.objects.filter(
            pet__isDeleted=False,
            isDeleted=False
        ).select_related('pet', 'disease')

        # Filtro idpet
        id_pet = self.request.query_params.get('idPet')
        if id_pet is not None:
            if not id_pet.isdigit():
                raise ValidationError({"idPet": "El parámetro idPet debe ser un número entero válido."})
            queryset = queryset.filter(pet_id=id_pet)

        # Filtro idOwner
        id_owner = self.request.query_params.get('idOwner') or self.request.query_params.get('owner')
        if id_owner is not None:
            if not id_owner.isdigit():
                raise ValidationError({"idOwner": "El parámetro idOwner debe ser un número entero válido."})
            queryset = queryset.filter(pet__idOwner=id_owner)

        # Filtro /?active=true
        active = self.request.query_params.get('active')
        if active is not None and active.lower() in ['true', '1']:
            queryset = queryset.filter(endDate__isnull=True)
        elif active is not None and active.lower() in ['false', '0']:
            queryset = queryset.filter(endDate__isnull=False)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except ValidationError as exc:
            if 'non_field_errors' in exc.detail and any(e.code == 'conflict' for e in exc.detail['non_field_errors']):
                return Response(exc.detail, status=status.HTTP_409_CONFLICT)
            raise exc

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except ValidationError as exc:
            if 'non_field_errors' in exc.detail and any(e.code == 'conflict' for e in exc.detail['non_field_errors']):
                return Response(exc.detail, status=status.HTTP_409_CONFLICT)
            raise exc

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.isDeleted = True
        instance.save(update_fields=['isDeleted'])
        return Response(status=status.HTTP_204_NO_CONTENT)