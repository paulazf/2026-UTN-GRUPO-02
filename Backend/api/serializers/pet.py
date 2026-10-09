import base64
import os
import uuid
from datetime import date
from decimal import Decimal
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from api.models import Breed, Pet
from .breed import BreedSerializer


class DuplicatePetException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Ya existe una mascota activa con el mismo nombre, raza y fecha de nacimiento para este dueño."
    default_code = "conflict"


class PhotoField(serializers.Field):

    def to_representation(self, value):
        if not value:
            return None
        request = self.context.get("request")
        if request and str(value).startswith("/media/"):
            return request.build_absolute_uri(value)
        return value

    def to_internal_value(self, data):
        if not data:
            return None

        if isinstance(data, str) and ";base64," in data:
            header, base64_str = data.split(";base64,")
            ext = ".jpg"
            if "png" in header.lower():
                ext = ".png"
            elif "webp" in header.lower():
                ext = ".webp"
            elif "jpeg" in header.lower() or "jpg" in header.lower():
                ext = ".jpg"

            try:
                decoded_bytes = base64.b64decode(base64_str)
            except Exception:
                raise serializers.ValidationError("Codificación Base64 inválida.")

            filename = f"pets/{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(filename, ContentFile(decoded_bytes))
            return default_storage.url(saved_path)

        if isinstance(data, str):
            cleaned = data.strip()
            return cleaned if cleaned else None

        if hasattr(data, "read"):
            ext = os.path.splitext(getattr(data, "name", "photo.jpg"))[1] or ".jpg"
            filename = f"pets/{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(filename, data)
            return default_storage.url(saved_path)

        raise serializers.ValidationError("Formato de foto inválido.")


class PetSerializer(serializers.ModelSerializer):
    breed = BreedSerializer(read_only=True)
    idBreed = serializers.PrimaryKeyRelatedField(
        queryset=Breed.objects.all(),
        source="breed",
        write_only=True,
        error_messages={
            "does_not_exist": "La raza especificada no existe.",
            "incorrect_type": "Identificador de raza inválido.",
        },
    )
    idOwner = serializers.IntegerField(
        error_messages={
            "required": "El campo idOwner es requerido para crear una mascota.",
            "invalid": "Identificador de dueño inválido.",
        }
    )
    age = serializers.IntegerField(read_only=True)
    photo = PhotoField(required=False, allow_null=True)

    class Meta:
        model = Pet
        fields = [
            "id",
            "name",
            "birthDate",
            "age",
            "neutered",
            "weight",
            "photo",
            "idBreed",
            "breed",
            "idOwner",
            "isDeleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "age", "isDeleted", "created_at", "updated_at"]
        validators = []  

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields["idOwner"].required = False
        else:
            self.fields["idOwner"].required = True

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío ni contener solo espacios en blanco.")
        if len(value) > 100:
            raise serializers.ValidationError("El nombre no puede superar los 100 caracteres.")
        return value.strip()

    def validate_birthDate(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de nacimiento no puede ser posterior a la fecha actual.")
        return value

    def validate_weight(self, value):
        if value is not None:
            if value <= Decimal("0"):
                raise serializers.ValidationError("El peso debe ser estrictamente mayor a 0.")
            if value > Decimal("150.00"):
                raise serializers.ValidationError("El peso no puede ser mayor a 150.00 kg.")
        return value

    def validate(self, attrs):
        target_owner = attrs.get("idOwner") or (self.instance.idOwner if self.instance else None)
        target_name = attrs.get("name") or (self.instance.name if self.instance else None)
        target_breed = attrs.get("breed") or (self.instance.breed if self.instance else None)
        target_birth_date = attrs.get("birthDate") or (self.instance.birthDate if self.instance else None)

        if target_owner and target_name and target_breed and target_birth_date:
            duplicate_qs = Pet.objects.filter(
                idOwner=target_owner,
                name__iexact=target_name.strip(),
                breed=target_breed,
                birthDate=target_birth_date,
                isDeleted=False,
            )
            if self.instance:
                duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)

            if duplicate_qs.exists():
                raise DuplicatePetException()

        return attrs