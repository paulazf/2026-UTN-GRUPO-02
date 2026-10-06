from rest_framework import serializers, status
from rest_framework.exceptions import APIException

from api.models import Disease


class DuplicateDiseaseException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Ya existe una enfermedad activa con ese nombre."
    default_code = "conflict"


class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = ["id", "name", "isDeleted"]
        read_only_fields = ["id", "isDeleted"]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                "El nombre no puede estar vacío ni contener solo espacios en blanco."
            )
        if len(value) > 100:
            raise serializers.ValidationError(
                "El nombre no puede superar los 100 caracteres."
            )
        return value.strip()

    def validate(self, attrs):
        name = attrs.get("name")
        if name is not None:
            name_clean = name.strip()
            queryset = Disease.objects.filter(name__iexact=name_clean, isDeleted=False)
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)

            if queryset.exists():
                raise DuplicateDiseaseException()

        return attrs
