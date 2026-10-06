from decimal import Decimal
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from api.models import Medication

class DuplicateMedicationException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Ya existe un medicamento activo con el mismo nombre y dosis en el catálogo."
    default_code = "conflict"


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            "idMedication",
            "name",
            "dose",
            "description",
            "isDeleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["idMedication", "isDeleted", "created_at", "updated_at"]
        validators = []

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío ni contener solo espacios en blanco.")
        if len(value) > 100:
            raise serializers.ValidationError("El nombre no puede superar los 100 caracteres.")
        return value.strip()

    def validate_dose(self, value):
        if value is not None:
            if value <= Decimal("0"):
                raise serializers.ValidationError("La dosis debe ser estrictamente mayor a 0.")
        return value

    def validate(self, attrs):
        target_name = attrs.get("name") or (self.instance.name if self.instance else None)
        target_dose = attrs.get("dose") or (self.instance.dose if self.instance else None)

        if target_name and target_dose:
            duplicate_qs = Medication.objects.filter(
                name__iexact=target_name.strip(),
                dose=target_dose,
                isDeleted=False,
            )
            
            if self.instance:
                duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)

            if duplicate_qs.exists():
                raise DuplicateMedicationException()

        return attrs