from django.db import models
from django.core.exceptions import ValidationError
from datetime import date
from .pet import Pet
from .disease import Disease


class PetDisease(models.Model):
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.PROTECT, 
        related_name="diseases", 
        db_column="idPet"
    )
    disease = models.ForeignKey(
        Disease, 
        on_delete=models.PROTECT, 
        related_name="pet_cases", 
        db_column="idDisease"
    )
    startDate = models.DateField()
    endDate = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "pet_disease"
        ordering = ["-startDate", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "disease"],
                condition=models.Q(isDeleted=False, endDate__isnull=True),
                name="unique_active_disease_per_pet",
            ),
            models.UniqueConstraint(
                fields=["pet", "disease", "startDate"],
                condition=models.Q(isDeleted=False),
                name="unique_pet_disease_start_date",
            )
        ]

    def clean(self):
        if self.startDate and self.startDate > date.today():
            raise ValidationError({"startDate": "La fecha de inicio no puede ser futura."})
        if self.endDate and self.startDate and self.endDate < self.startDate:
            raise ValidationError({"endDate": "La fecha de fin no puede ser anterior a la fecha de inicio."})

    def __str__(self):
        return f"{self.pet.name} - {self.disease.name} ({self.startDate})"