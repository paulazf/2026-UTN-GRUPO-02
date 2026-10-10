from datetime import date
from django.core.exceptions import ValidationError
from django.db import models

from .medication import Medication
from .pet import Pet


class MedicationPet(models.Model):
    pet = models.ForeignKey(
        Pet,
        on_delete=models.PROTECT,
        related_name="medications",
        db_column="idPet",
    )
    medication = models.ForeignKey(
        Medication,
        on_delete=models.PROTECT,
        related_name="pet_treatments",
        db_column="idMedication",
    )
    frequencyHours = models.IntegerField(db_column="frequencyHours")
    quantityDose = models.IntegerField(db_column="quantityDose")
    startDate = models.DateField(db_column="startDate")
    notes = models.TextField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medication_pet"
        ordering = ["-startDate", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "medication"],
                condition=models.Q(isDeleted=False),
                name="unique_active_medication_per_pet",
            )
        ]

    def clean(self):
        if self.startDate and self.startDate > date.today():
            raise ValidationError({"startDate": "La fecha de inicio no puede ser futura."})
        if self.frequencyHours is not None and self.frequencyHours <= 0:
            raise ValidationError({"frequencyHours": "La frecuencia en horas debe ser mayor a cero."})
        if self.quantityDose is not None and self.quantityDose <= 0:
            raise ValidationError({"quantityDose": "La cantidad por dosis debe ser mayor a cero."})

    def __str__(self):
        return f"{self.pet.name} - {self.medication.name} (Cada {self.frequencyHours}hs)"

