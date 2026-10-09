from rest_framework import serializers
from django.contrib.auth.models import User
from ..models.owner import Owner
from django.db import transaction

class OwnerSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Owner
        fields = ['idOwner', 'firstName', 'lastName', 'email', 'phone', 'password']
        read_only_fields = ['idOwner']

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data['email'].lower()
        
        # Crear el usuario base de Django para autenticación
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password']
        )
        
        # Crear el perfil Owner asociado
        owner = Owner.objects.create(
            user=user,
            email=email,
            firstName=validated_data.get('firstName', ''),
            lastName=validated_data.get('lastName', ''),
            phone=validated_data.get('phone', '')
        )
        return owner

class OwnerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Owner
        fields = ['firstName', 'lastName', 'phone']

class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(required=True)
    newPassword = serializers.CharField(required=True)
