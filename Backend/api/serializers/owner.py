from rest_framework import serializers
from django.contrib.auth.models import User
from ..models.owner import Owner
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class OwnerSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(max_length=150)
    lastName = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    class Meta:
        model = Owner
        fields = ['idOwner', 'firstName', 'lastName', 'email', 'phone', 'authProvider', 'password']
        read_only_fields = ['idOwner', 'authProvider']

    def validate_email(self, value):
        value = value.strip().lower()
        query_user = User.objects.filter(username=value)
        query_owner = Owner.objects.filter(email=value)
        if self.instance:
            query_user = query_user.exclude(pk=self.instance.user_id)
            query_owner = query_owner.exclude(pk=self.instance.pk)
        if query_user.exists() or query_owner.exists():
            raise serializers.ValidationError("Ya existe un usuario con este correo electrónico.")
        return value

    def validate(self, attrs):
        if not self.instance and 'password' in attrs:
            candidato = User(
                username=attrs.get("email", ""),
                first_name=attrs.get("firstName", ""),
                last_name=attrs.get("lastName", ""),
                email=attrs.get("email", ""),
            )
            try:
                validate_password(attrs["password"], user=candidato)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data['email'].lower()
        
        # Crear el usuario base de Django para autenticación
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=validated_data.get('firstName', ''),
            last_name=validated_data.get('lastName', '')
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

RegisterSerializer = OwnerSerializer

class OwnerUpdateSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(max_length=150, required=False)
    lastName = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    class Meta:
        model = Owner
        fields = ['firstName', 'lastName', 'phone']

    def validate_phone(self, value):
        value = (value or "").strip()
        return value or None

class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True, trim_whitespace=False)
    newPassword = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None

        if user and not user.check_password(attrs["currentPassword"]):
            raise serializers.ValidationError({"currentPassword": ["La contraseña actual es incorrecta."]})

        if attrs["newPassword"] == attrs["currentPassword"]:
            raise serializers.ValidationError({"newPassword": ["La nueva contraseña debe ser distinta de la actual."]})

        try:
            validate_password(attrs["newPassword"], user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"newPassword": list(e.messages)})

        return attrs

