from rest_framework import serializers

from api.models.province import Province
from api.models.city import City


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ["idProvince", "name"]


class CitySerializer(serializers.ModelSerializer):
    provinceName = serializers.CharField(source="province.name", read_only=True)

    class Meta:
        model = City
        fields = ["idCity", "name", "idProvince", "provinceName"]
        extra_kwargs = {
            "idProvince": {"source": "province_id"},
        }

