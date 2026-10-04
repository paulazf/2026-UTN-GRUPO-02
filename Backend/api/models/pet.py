from datetime import date
from django.db import models
from django.db.models import Q

from .breed import Breed


class Pet(models.Model):
    name = models.CharField(max_length=100)
    birthDate = models.DateField()
    neutered = models.BooleanField(default=False)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    photo = models.URLField(null=True, blank=True)
    breed = models.ForeignKey(Breed, on_delete=models.PROTECT, related_name="pets")
    idOwner = models.PositiveIntegerField(help_text="ID del dueño asignado por el módulo Owner")
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pet"
        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["idOwner", "name", "breed", "birthDate"],
                condition=Q(isDeleted=False),
                name="unique_active_pet_per_owner",
            )
        ]

    @property
    def age(self):
        if not self.birthDate:
            return None
        today = date.today()
        return (
            today.year
            - self.birthDate.year
            - ((today.month, today.day) < (self.birthDate.month, self.birthDate.day))
        )

    def __str__(self):
        return f"{self.name} (Owner ID: {self.idOwner}, Breed: {self.breed.name})"
