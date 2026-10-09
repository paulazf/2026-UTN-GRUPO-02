import os
from datetime import date

from django.conf import settings
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from api.models import MedicalTest, MedicalTestFile, Pet

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def active_pets(request):
    """
    Mascotas sobre las que el usuario puede operar.
    """
    qs = Pet.objects.filter(isDeleted=False)
    if request and hasattr(request.user, 'owner_profile'):
        qs = qs.filter(idOwner=request.user.owner_profile.idOwner)
    return qs


def validate_upload(value):
    if value.size == 0:
        raise serializers.ValidationError(f"El archivo {value.name} está vacío.")
    if value.size > settings.MEDICAL_TEST_MAX_SIZE:
        raise serializers.ValidationError(f"El archivo {value.name} supera el máximo de 10 MB.")
    extension = "." + value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
    content_type = getattr(value, "content_type", None)
    if (
        extension not in ALLOWED_EXTENSIONS
        or content_type not in settings.MEDICAL_TEST_ALLOWED_TYPES
    ):
        raise serializers.ValidationError(
            f"Formato no permitido en {value.name}. Se aceptan PDF, JPG, JPEG o PNG."
        )
    return value


class MedicalTestFileSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="file", read_only=True, use_url=True)

    class Meta:
        model = MedicalTestFile
        fields = ["idMedicalTestFile", "name", "url"]


class MedicalTestSerializer(serializers.ModelSerializer):
    idPet = serializers.IntegerField(source="pet_id")
    petName = serializers.CharField(source="pet.name", read_only=True)
    files = MedicalTestFileSerializer(many=True, read_only=True)
    # Escritura: archivos a agregar (se repite la clave en el multipart) e ids a quitar.
    newFiles = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
    )
    removedFiles = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

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
            "files",
            "newFiles",
            "removedFiles",
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

    def validate_newFiles(self, value):
        for upload in value:
            validate_upload(upload)
        return value

    def validate_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha del estudio no puede ser futura.")
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

        self._validate_files(attrs)
        return attrs

    def _validate_files(self, attrs):
        removed = set(attrs.get("removedFiles", []))
        current = set()
        if self.instance is not None:
            current = set(self.instance.files.values_list("idMedicalTestFile", flat=True))
        if removed - current:
            raise serializers.ValidationError(
                {"removedFiles": ["Alguno de los archivos a quitar no pertenece al estudio."]}
            )
        total = len(current - removed) + len(attrs.get("newFiles", []))
        if total > settings.MEDICAL_TEST_MAX_FILES:
            raise serializers.ValidationError(
                {"newFiles": [f"Un estudio puede tener hasta {settings.MEDICAL_TEST_MAX_FILES} archivos."]}
            )

    # ---------- Persistencia ----------

    def _add_files(self, test, uploads):
        for upload in uploads:
            MedicalTestFile.objects.create(
                medicalTest=test, file=upload, name=os.path.basename(upload.name)
            )

    def create(self, validated_data):
        uploads = validated_data.pop("newFiles", [])
        validated_data.pop("removedFiles", None)
        with transaction.atomic():
            test = super().create(validated_data)
            self._add_files(test, uploads)
        return test

    def update(self, instance, validated_data):
        uploads = validated_data.pop("newFiles", [])
        removed_ids = validated_data.pop("removedFiles", [])
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            removed = list(instance.files.filter(idMedicalTestFile__in=removed_ids))
            for item in removed:
                item.delete()
                # Se borra del disco recién cuando la base confirmó el cambio.
                storage, name = item.file.storage, item.file.name
                transaction.on_commit(lambda s=storage, n=name: s.delete(n))
            self._add_files(instance, uploads)
        return instance
