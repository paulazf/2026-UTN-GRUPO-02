from datetime import date
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, NotFound

from api.models import Feeding, FeedingType
from api.serializers.medical_test import active_pets


class DuplicateFeedingException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "La mascota ya tiene registrada una pauta de alimentación para este alimento y fecha de inicio."
    default_code = "conflict"


class FeedingSerializer(serializers.ModelSerializer):
    idPet = serializers.IntegerField(source="pet_id")
    petName = serializers.CharField(source="pet.name", read_only=True)
    typeDisplay = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = Feeding
        fields = [
            "idFeeding",
            "idPet",
            "petName",
            "food",
            "type",
            "typeDisplay",
            "portion",
            "sinceDate",
            "frequency",
            "notes",
            "isDeleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["idFeeding", "isDeleted", "created_at", "updated_at"]
        validators = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # En actualización (PUT), idPet no es editable
        if self.instance is not None:
            if "idPet" in self.fields:
                self.fields["idPet"].required = False

    def validate_idPet(self, value):
        if self.instance is not None:
            if value != self.instance.pet_id:
                raise serializers.ValidationError("No se puede cambiar la mascota de la pauta de alimentación.")
            return value

        request = self.context.get("request")
        pets = active_pets(request)
        if not pets.filter(pk=value).exists():
            raise NotFound("Mascota no encontrada.")
        return value

    def validate_food(self, value):
        val = (value or "").strip()
        if not val:
            raise serializers.ValidationError("El alimento no puede estar vacío.")
        if len(val) > 150:
            raise serializers.ValidationError("El alimento no puede superar los 150 caracteres.")
        return val

    def validate_type(self, value):
        if value not in FeedingType.values:
            raise serializers.ValidationError(
                f"Tipo de alimento no válido. Opciones permitidas: {', '.join(FeedingType.values)}."
            )
        return value

    def validate_portion(self, value):
        val = (value or "").strip()
        if not val:
            raise serializers.ValidationError("La porción no puede estar vacía.")
        if len(val) > 100:
            raise serializers.ValidationError("La porción no puede superar los 100 caracteres.")
        return val

    def validate_frequency(self, value):
        val = (value or "").strip()
        if not val:
            raise serializers.ValidationError("La frecuencia no puede estar vacía.")
        if len(val) > 100:
            raise serializers.ValidationError("La frecuencia no puede superar los 100 caracteres.")
        return val

    def validate_sinceDate(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de inicio no puede ser futura.")
        return value

    def validate_notes(self, value):
        return (value or "").strip()

    def validate(self, attrs):
        instance = self.instance
        pet_id = attrs.get("pet_id", getattr(instance, "pet_id", None))
        food = attrs.get("food", getattr(instance, "food", None))
        since_date = attrs.get("sinceDate", getattr(instance, "sinceDate", None))

        if pet_id and food and since_date:
            duplicate_qs = Feeding.objects.filter(
                pet_id=pet_id,
                food__iexact=food,
                sinceDate=since_date,
                isDeleted=False,
            )
            if instance is not None:
                duplicate_qs = duplicate_qs.exclude(pk=instance.pk)
            if duplicate_qs.exists():
                raise DuplicateFeedingException()

        return attrs

