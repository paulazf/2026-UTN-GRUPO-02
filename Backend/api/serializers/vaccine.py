from rest_framework import serializers, status
from rest_framework.exceptions import APIException

from api.models import Vaccine


class DuplicateVaccineException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Ya existe un producto activo con el mismo nombre y laboratorio en el catálogo."
    default_code = "conflict"


class VaccineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vaccine
        fields = [
            "idVaccine",
            "name",
            "laboratory",
            "type",
            "species",
            "validityDays",
            "isDeleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["idVaccine", "isDeleted", "created_at", "updated_at"]
        validators = []

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío ni contener solo espacios en blanco.")
        if len(value.strip()) > 100:
            raise serializers.ValidationError("El nombre no puede superar los 100 caracteres.")
        return value.strip()

    def validate_laboratory(self, value):
        return (value or "").strip()

    def validate_validityDays(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La vigencia en días debe ser mayor a 0.")
        return value

    def validate(self, attrs):
        name = attrs.get("name", getattr(self.instance, "name", None))
        laboratory = attrs.get("laboratory", getattr(self.instance, "laboratory", ""))

        if name:
            duplicate_qs = Vaccine.objects.filter(
                name__iexact=name.strip(),
                laboratory__iexact=(laboratory or "").strip(),
                isDeleted=False,
            )
            if self.instance:
                duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)
            if duplicate_qs.exists():
                raise DuplicateVaccineException()

        return attrs
