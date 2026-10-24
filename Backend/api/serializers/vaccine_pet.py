from datetime import date

from django.conf import settings
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, NotFound

from api.models import Pet, Vaccine, VaccinePet, VaccineType
from api.serializers.medical_test import active_pets


class DuplicateVaccinePetException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "La mascota ya tiene registrada una aplicación de este producto en esa fecha."
    default_code = "conflict"


def compute_status(obj):
    """VALID, EXPIRING, EXPIRED o RENEWED (TDD-0029)."""
    if getattr(obj, "hasNewer", False):
        return "RENEWED"
    days = (obj.expirationDate - date.today()).days
    if days < 0:
        return "EXPIRED"
    if days <= settings.VACCINE_EXPIRING_DAYS:
        return "EXPIRING"
    return "VALID"


class VaccinePetSerializer(serializers.ModelSerializer):
    idPet = serializers.IntegerField(source="pet_id")
    petName = serializers.CharField(source="pet.name", read_only=True)
    idVaccine = serializers.IntegerField(source="vaccine_id")
    vaccineName = serializers.CharField(source="vaccine.name", read_only=True)
    laboratory = serializers.CharField(source="vaccine.laboratory", read_only=True)
    vaccineType = serializers.CharField(source="vaccine.type", read_only=True)
    status = serializers.SerializerMethodField()
    daysToExpiration = serializers.SerializerMethodField()

    class Meta:
        model = VaccinePet
        fields = [
            "idVaccinePet",
            "idPet",
            "petName",
            "idVaccine",
            "vaccineName",
            "laboratory",
            "vaccineType",
            "doseNumber",
            "applicationDate",
            "expirationDate",
            "notes",
            "status",
            "daysToExpiration",
            "isDeleted",
        ]
        read_only_fields = ["idVaccinePet", "isDeleted"]
        validators = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            for field in ("idPet", "idVaccine", "applicationDate", "expirationDate"):
                self.fields[field].required = False

    def get_status(self, obj):
        return compute_status(obj)

    def get_daysToExpiration(self, obj):
        return (obj.expirationDate - date.today()).days

    # ---------- Validaciones por campo ----------

    def validate_idPet(self, value):
        if self.instance is not None:
            if value != self.instance.pet_id:
                raise serializers.ValidationError("No se puede cambiar la mascota de la aplicación.")
            return value
        if not active_pets(self.context.get("request")).filter(pk=value).exists():
            # 404 y no 400: no se revela si la mascota existe o es de otro dueño.
            raise NotFound("Mascota no encontrada.")
        return value

    def validate_idVaccine(self, value):
        if self.instance is not None:
            if value != self.instance.vaccine_id:
                raise serializers.ValidationError("No se puede cambiar el producto de la aplicación.")
            return value
        if not Vaccine.objects.filter(pk=value, isDeleted=False).exists():
            raise NotFound("Vacuna o antiparasitario no encontrado.")
        return value

    def validate_doseNumber(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError("El número de dosis debe ser mayor a 0.")
        return value

    def validate_applicationDate(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de aplicación no puede ser futura.")
        return value

    def validate_notes(self, value):
        return (value or "").strip()

    # ---------- Validaciones entre campos ----------

    def validate(self, attrs):
        instance = self.instance
        pet_id = attrs.get("pet_id", getattr(instance, "pet_id", None))
        vaccine_id = attrs.get("vaccine_id", getattr(instance, "vaccine_id", None))
        dose = attrs.get("doseNumber", getattr(instance, "doseNumber", None))
        application = attrs.get("applicationDate", getattr(instance, "applicationDate", None))
        expiration = attrs.get("expirationDate", getattr(instance, "expirationDate", None))

        vaccine = Vaccine.objects.get(pk=vaccine_id)
        pet = Pet.objects.select_related("breed").get(pk=pet_id)

        if instance is None and vaccine.species and vaccine.species != pet.breed.species:
            raise serializers.ValidationError(
                {"idVaccine": [f"{vaccine.name} no se aplica a la especie de {pet.name}."]}
            )

        if vaccine.type == VaccineType.VACCINE and dose is None:
            raise serializers.ValidationError(
                {"doseNumber": ["El número de dosis es obligatorio para las vacunas."]}
            )

        if application and expiration and expiration <= application:
            raise serializers.ValidationError(
                {"expirationDate": ["La fecha de vencimiento debe ser posterior a la de aplicación."]}
            )

        duplicate_qs = VaccinePet.objects.filter(
            pet_id=pet_id, vaccine_id=vaccine_id, applicationDate=application, isDeleted=False
        )
        if instance is not None:
            duplicate_qs = duplicate_qs.exclude(pk=instance.pk)
        if duplicate_qs.exists():
            raise DuplicateVaccinePetException()

        return attrs
