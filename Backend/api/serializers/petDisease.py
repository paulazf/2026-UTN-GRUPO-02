from rest_framework import serializers
from datetime import date
from api.models.petDisease import PetDisease
from api.models.pet import Pet
from api.models.disease import Disease


class PetDiseaseSerializer(serializers.ModelSerializer):
    idPet = serializers.PrimaryKeyRelatedField(
        queryset=Pet.objects.filter(isDeleted=False),
        source='pet',
        error_messages={
            "does_not_exist": "La mascota especificada no existe.",
            "incorrect_type": "Identificador de mascota inválido.",
        }
    )
    idDisease = serializers.PrimaryKeyRelatedField(
        queryset=Disease.objects.filter(isDeleted=False),
        source='disease',
        error_messages={
            "does_not_exist": "La enfermedad especificada no existe.",
            "incorrect_type": "Identificador de enfermedad inválido.",
        }
    )
    idOwner = serializers.IntegerField(source='pet.idOwner', read_only=True)
    petName = serializers.CharField(source='pet.name', read_only=True)
    diseaseName = serializers.CharField(source='disease.name', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = PetDisease
        fields = [
            'id',
            'idPet',
            'petName',
            'idOwner',
            'idDisease',
            'diseaseName',
            'startDate',
            'endDate',
            'status',
            'notes',
            'isDeleted',
        ]
        read_only_fields = ['id', 'isDeleted', 'petName', 'diseaseName', 'idOwner', 'status']

    def get_status(self, obj):
        return "En seguimiento" if obj.endDate is None else "Controlado"

    def validate(self, attrs):
        start_date = attrs.get('startDate', getattr(self.instance, 'startDate', None))
        end_date = attrs.get('endDate', getattr(self.instance, 'endDate', None))
        pet = attrs.get('pet', getattr(self.instance, 'pet', None))
        disease = attrs.get('disease', getattr(self.instance, 'disease', None))

        # 1. Validar que startDate o endDate no sean futuras
        if start_date and start_date > date.today():
            raise serializers.ValidationError({"startDate": "La fecha de inicio no puede ser posterior a la fecha actual."})

        if end_date and end_date > date.today():
            raise serializers.ValidationError({"endDate": "La fecha de fin no puede ser posterior a la fecha actual."})

        # 2. Validar que endDate >= startDate
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({"endDate": "La fecha de fin no puede ser anterior a la fecha de inicio."})

        # 3. Validar pet y disease activas (no borradas lógicamente)
        if pet and getattr(pet, 'isDeleted', False):
            raise serializers.ValidationError({"idPet": "La mascota especificada no existe o está dada de baja."})

        if disease and getattr(disease, 'isDeleted', False):
            raise serializers.ValidationError({"idDisease": "La enfermedad especificada no está activa en el catálogo."})

        # 4. Validar duplicado activo (HTTP 409 Conflict)
        if end_date is None and pet and disease:
            query = PetDisease.objects.filter(
                pet=pet,
                disease=disease,
                endDate__isnull=True,
                isDeleted=False
            )
            if self.instance:
                query = query.exclude(pk=self.instance.pk)

            if query.exists():
                raise serializers.ValidationError(
                    {"non_field_errors": "La mascota ya posee esta enfermedad activa en curso."},
                    code='conflict'
                )

        return attrs