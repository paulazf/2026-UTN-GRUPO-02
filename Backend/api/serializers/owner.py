from rest_framework import serializers
from ..models.owner import Owner

class OwnerSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Owner
        fields = ['idOwner', 'firstName', 'lastName', 'email', 'phone', 'password']
        read_only_fields = ['idOwner']

    def create(self, validated_data):
        # Usamos el manager personalizado que pasa el email a minúsculas y hashea la contraseña
        user = Owner.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            firstName=validated_data.get('firstName', ''),
            lastName=validated_data.get('lastName', ''),
            phone=validated_data.get('phone', '')
        )
        return user

class OwnerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Owner
        fields = ['firstName', 'lastName', 'phone']

class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(required=True)
    newPassword = serializers.CharField(required=True)
