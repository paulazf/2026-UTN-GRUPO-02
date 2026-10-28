from django.db import transaction
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, NotFound

from api.models.address import Address
from api.models.appointment import Appointment
from api.models.city import City
from api.serializers.address import AddressSerializer
from api.serializers.medical_test import active_pets


class DuplicateAppointmentException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "La mascota ya tiene un turno agendado en esa fecha y horario."
    default_code = "conflict"


class AppointmentSerializer(serializers.ModelSerializer):
    idPet = serializers.IntegerField(source="pet_id")
    petName = serializers.CharField(source="pet.name", read_only=True)
    idAddress = serializers.IntegerField(source="address_id", required=False, allow_null=True)
    address = AddressSerializer(read_only=True)
    newAddress = AddressSerializer(required=False, write_only=True)

    class Meta:
        model = Appointment
        fields = [
            "idAppointment",
            "idPet",
            "petName",
            "idAddress",
            "address",
            "newAddress",
            "date",
            "time",
            "veterinarian",
            "description",
            "isDeleted",
        ]
        read_only_fields = ["idAppointment", "petName", "address", "isDeleted"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields["idPet"].required = False
            self.fields["date"].required = False
            self.fields["time"].required = False
            self.fields["veterinarian"].required = False

    def validate_idPet(self, value):
        if self.instance is not None:
            if value != self.instance.pet_id:
                raise serializers.ValidationError("No se puede cambiar la mascota del turno.")
            return value
        request = self.context.get("request")
        if not active_pets(request).filter(pk=value).exists():
            raise NotFound("Mascota no encontrada.")
        return value

    def validate_veterinarian(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del veterinario es obligatorio.")
        return value.strip()

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        owner = getattr(user, "owner_profile", None) if user else None

        # Si viene en update
        target_pet = attrs.get("pet_id") or (self.instance.pet_id if self.instance else None)
        target_date = attrs.get("date") or (self.instance.date if self.instance else None)
        target_time = attrs.get("time") or (self.instance.time if self.instance else None)

        # 1. Validar que la fecha del turno no sea previa al nacimiento de la mascota
        if target_pet and target_date:
            from api.models.pet import Pet
            pet_obj = Pet.objects.filter(pk=target_pet).first()
            if pet_obj and pet_obj.birthDate and target_date < pet_obj.birthDate:
                raise serializers.ValidationError(
                    {"date": "La fecha del turno no puede ser previa al nacimiento de la mascota."}
                )

        # 2. Validar colisión de turno activo en misma mascota, fecha y hora
        if target_pet and target_date and target_time:
            dup_qs = Appointment.objects.filter(
                pet_id=target_pet,
                date=target_date,
                time=target_time,
                isDeleted=False,
            )
            if self.instance:
                dup_qs = dup_qs.exclude(pk=self.instance.pk)
            if dup_qs.exists():
                raise DuplicateAppointmentException()

        # 2. Manejo de idAddress y newAddress
        new_address_data = attrs.get("newAddress")
        address_id = attrs.get("address_id")

        if new_address_data and address_id:
            raise serializers.ValidationError(
                {"idAddress": "No puede especificar idAddress y newAddress al mismo tiempo."}
            )

        if address_id:
            # Validar que pertenezca al usuario (o sin dueño/creado por él)
            addr_qs = Address.objects.filter(pk=address_id, isDeleted=False)
            if owner:
                addr_qs = addr_qs.filter(owner=owner)
            if not addr_qs.exists():
                raise serializers.ValidationError({"idAddress": "El domicilio especificado no existe o no pertenece al usuario."})

        return attrs

    def create(self, validated_data):
        new_address_data = validated_data.pop("newAddress", None)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        owner = getattr(user, "owner_profile", None) if user else None

        with transaction.atomic():
            if new_address_data:
                # newAddress ya viene como dict validado por DRF o dict interno
                city_id = new_address_data.get("city_id")
                address_instance = Address.objects.create(
                    owner=owner,
                    city_id=city_id,
                    referenceName=new_address_data.get("referenceName"),
                    street=new_address_data.get("street"),
                    number=new_address_data.get("number"),
                    floor=new_address_data.get("floor"),
                    apartment=new_address_data.get("apartment"),
                )
                validated_data["address_id"] = address_instance.pk

            return super().create(validated_data)

    def update(self, instance, validated_data):
        new_address_data = validated_data.pop("newAddress", None)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        owner = getattr(user, "owner_profile", None) if user else None

        with transaction.atomic():
            if new_address_data:
                city_id = new_address_data.get("city_id")
                address_instance = Address.objects.create(
                    owner=owner,
                    city_id=city_id,
                    referenceName=new_address_data.get("referenceName"),
                    street=new_address_data.get("street"),
                    number=new_address_data.get("number"),
                    floor=new_address_data.get("floor"),
                    apartment=new_address_data.get("apartment"),
                )
                validated_data["address_id"] = address_instance.pk

            return super().update(instance, validated_data)

