from rest_framework import serializers
from rest_framework.exceptions import NotFound

from api.models.address import Address
from api.models.city import City


class AddressSerializer(serializers.ModelSerializer):
    idCity = serializers.IntegerField(source="city_id")
    cityName = serializers.CharField(source="city.name", read_only=True)
    provinceName = serializers.CharField(source="city.province.name", read_only=True)
    idProvince = serializers.IntegerField(source="city.province_id", read_only=True)

    class Meta:
        model = Address
        fields = [
            "idAddress",
            "referenceName",
            "street",
            "number",
            "floor",
            "apartment",
            "idCity",
            "cityName",
            "idProvince",
            "provinceName",
            "isDeleted",
        ]
        read_only_fields = [
            "idAddress",
            "cityName",
            "idProvince",
            "provinceName",
            "isDeleted",
        ]

    def validate_idCity(self, value):
        if not City.objects.filter(pk=value).exists():
            raise serializers.ValidationError("La localidad ingresada no existe en el catálogo.")
        return value

    def validate_referenceName(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre de referencia no puede estar vacío.")
        return value.strip()

    def validate_street(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La calle es obligatoria.")
        return value.strip()

    def validate_number(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("El número es obligatorio.")
        return str(value).strip()

