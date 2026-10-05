from datetime import date

from django.conf import settings
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from api.models import MedicalTest, Pet

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def active_pets(request):
    """
    Mascotas sobre las que el usuario puede operar.
    TODO (EP01): cuando haya autenticación, filtrar también por dueño:
    .filter(idOwner=<id del dueño autenticado>)
    """
    return Pet.objects.filter(isDeleted=False)


class MedicalTestSerializer(serializers.ModelSerializer):
    idPet = serializers.IntegerField(source="pet_id")
    petName = serializers.CharField(source="pet.name", read_only=True)
    file = serializers.FileField(required=False, allow_null=True, use_url=True)

    class Meta:
        model = MedicalTest
        fields = [
            "idMedicalTest",
            "idPet",
            "petName",
            "name",
            "type",
            "date",
            "veterinarian",
            "status",
            "resultSummary",
            "resultDetail",
            "file",
            "isDeleted",
        ]
        read_only_fields = ["idMedicalTest", "isDeleted"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # En la edición idPet no es obligatorio (y si llega, se rechaza en validate).
        if self.instance is not None:
            self.fields["idPet"].required = False

    # ---------- Validaciones por campo ----------

    def validate_idPet(self, value):
        if self.instance is not None:
            return value
        request = self.context.get("request")
        if not active_pets(request).filter(pk=value).exists():
            # 404 y no 400: no se revela si la mascota existe o es de otro dueño.
            raise NotFound("Mascota no encontrada.")
        return value

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre del estudio es obligatorio.")
        return value

    def validate_veterinarian(self, value):
        return value.strip()

    def validate_resultSummary(self, value):
        return value.strip()

    def validate_resultDetail(self, value):
        return value.strip()

    def validate_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha del estudio no puede ser futura.")
        return value

    def validate_file(self, value):
        if value is None:
            return value
        if value.size == 0:
            raise serializers.ValidationError("El archivo está vacío.")
        if value.size > settings.MEDICAL_TEST_MAX_SIZE:
            raise serializers.ValidationError("El archivo supera el máximo de 10 MB.")
        extension = "." + value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
        content_type = getattr(value, "content_type", None)
        if (
            extension not in ALLOWED_EXTENSIONS
            or content_type not in settings.MEDICAL_TEST_ALLOWED_TYPES
        ):
            raise serializers.ValidationError(
                "Formato no permitido. Se aceptan PDF, JPG, JPEG o PNG."
            )
        return value

    # ---------- Validaciones entre campos ----------

    def validate(self, attrs):
        if self.instance is not None and "pet_id" in attrs:
            raise serializers.ValidationError(
                {"idPet": ["No se puede cambiar la mascota de un estudio."]}
            )

        # Estado final = lo que llega + lo que ya tenía (en la edición).
        status = attrs.get("status", getattr(self.instance, "status", None))
        summary = attrs.get("resultSummary", getattr(self.instance, "resultSummary", ""))
        if status in (MedicalTest.Status.NORMAL, MedicalTest.Status.ALTERED) and not summary:
            raise serializers.ValidationError(
                {
                    "resultSummary": [
                        "El resultado resumido es obligatorio cuando el estado es Normal o Alterado."
                    ]
                }
            )
        return attrs

    # ---------- Persistencia ----------

    def update(self, instance, validated_data):
        old_file = instance.file if "file" in validated_data else None
        old_name = old_file.name if old_file else None
        instance = super().update(instance, validated_data)

        new_name = instance.file.name if instance.file else None
        if old_name and old_name != new_name:
            storage = old_file.storage
            # Se borra recién cuando la base confirmó el cambio.
            transaction.on_commit(lambda: storage.delete(old_name))
        return instance
