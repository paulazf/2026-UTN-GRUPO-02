from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

class OwnerManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        
        # El TDD y las buenas prácticas exigen que el email sea case-insensitive
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        
        # set_password encripta la contraseña automáticamente
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class Owner(AbstractBaseUser, PermissionsMixin):
    idOwner = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=255)
    lastName = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Requerido por Django para usuarios administradores
    is_staff = models.BooleanField(default=False)

    objects = OwnerManager()

    # Definimos el campo principal de autenticación
    USERNAME_FIELD = 'email'
    # Campos adicionales requeridos al crear por consola (createsuperuser)
    REQUIRED_FIELDS = ['firstName', 'lastName']

    class Meta:
        db_table = 'owner'

    def __str__(self):
        return self.email
