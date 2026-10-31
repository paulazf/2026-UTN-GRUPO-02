from django.db import models
from django.contrib.auth.models import User

class Owner(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='owner_profile')
    idOwner = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=255)
    lastName = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    authProvider = models.CharField(max_length=20, default='email')
    
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'owner'

    @property
    def full_name(self):
        return f"{self.firstName} {self.lastName}".strip()

    def __str__(self):
        return f"{self.full_name} ({self.email})"
