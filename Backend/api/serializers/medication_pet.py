from datetime import date
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, NotFound

from api.models import Medication, MedicationPet
from api.serializers.medical_test import active_pets


class DuplicateMedicationPetException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "La mascota ya tiene un registro activo para este medicamento."
    default_code = "conflict"


class MedicationPetSerializer(serializers.ModelSerializer):
    idPet = serializers.IntegerField(source="pet_id")
    petName = serializers.CharField(source="pet.name", read_only=True)
    idMedication = serializers.IntegerField(source="medication_id")
    medicationName = serializers.CharField(source="medication.name", read_only=True)

    class Meta:
        model = MedicationPet
        fields = [
            "id",
            "idPet",
            "petName",
            "idMedication",
            "medicationName",
            "frequencyHours",
            "quantityDose",
            "startDate",
            "notes",
            "isDeleted",
        ]
        read_only_fields = ["id", "petName", "medicationName", "isDeleted"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields["idPet"].required = False
            self.fields["idMedication"].required = False
            self.fields["frequencyHours"].required = False
            self.fields["quantityDose"].required = False
            self.fields["startDate"].required = False

    def validate_idPet(self, value):
        if self.instance is not None:
            if value != self.instance.pet_id:
                raise serializers.ValidationError("No se puede cambiar la mascota del tratamiento.")
            return value
        request = self.context.get("request")
        if not active_pets(request).filter(pk=value).exists():
            raise NotFound("Mascota no encontrada.")
        return value

    def validate_idMedication(self, value):
        if self.instance is not None:
            if value != self.instance.medication_id:
                raise serializers.ValidationError("No se puede cambiar el medicamento del tratamiento.")
            return value
        if not Medication.objects.filter(pk=value, isDeleted=False).exists():
            raise NotFound("Medicamento no encontrado.")
        return value

    def validate_frequencyHours(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La frecuencia en horas debe ser mayor a cero.")
        return value

    def validate_quantityDose(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La cantidad por dosis debe ser mayor a cero.")
        return value

    def validate_startDate(self, value):
        if value is not None and value > date.today():
            raise serializers.ValidationError("La fecha de inicio no puede ser futura.")
        return value

    def validate(self, attrs):
        if self.instance is not None:
            if "pet_id" in attrs and attrs["pet_id"] != self.instance.pet_id:
                raise serializers.ValidationError({"idPet": "No se puede cambiar la mascota del tratamiento."})
            if "medication_id" in attrs and attrs["medication_id"] != self.instance.medication_id:
                raise serializers.ValidationError({"idMedication": "No se puede cambiar el medicamento del tratamiento."})

        target_pet = attrs.get("pet_id") or (self.instance.pet_id if self.instance else None)
        target_medication = attrs.get("medication_id") or (self.instance.medication_id if self.instance else None)

        if target_pet and target_medication:
            duplicate_qs = MedicationPet.objects.filter(
                pet_id=target_pet,
                medication_id=target_medication,
                isDeleted=False,
            )
            if self.instance:
                duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)

            if duplicate_qs.exists():
                raise DuplicateMedicationPetException()

        return attrs

