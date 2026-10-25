import math
from datetime import date, timedelta
from django.core.exceptions import ValidationError
from django.db import models

from .medication import Medication
from .pet import Pet


def calculate_medication_end_date(start_date: date, frequency_hours: int, quantity_dose: int) -> date:
    """Calcula la fecha de fin a partir de la fecha de inicio, la frecuencia horaria y la cantidad de dosis.

    Total de horas de tratamiento = frequency_hours * quantity_dose.
    - Si el total es menor a 24 horas, finaliza el mismo día (startDate).
    - Si es de 24 horas o más, abarca al menos 2 fechas calendario (suma ceil(total_horas / 24) días).
    """
    if not (start_date and frequency_hours and quantity_dose):
        return None
    total_hours = frequency_hours * quantity_dose
    days_to_add = math.ceil(total_hours / 24) if total_hours >= 24 else 0
    return start_date + timedelta(days=days_to_add)


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
    endDate = models.DateField(db_column="endDate")
    notes = models.TextField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medication_pet"
        ordering = ["-startDate", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "medication", "startDate"],
                condition=models.Q(isDeleted=False),
                name="unique_pet_medication_start_date",
            ),
        ]

    def clean(self):
        if self.startDate and self.startDate > date.today():
            raise ValidationError({"startDate": "La fecha de inicio no puede ser futura."})
        if self.frequencyHours is not None and self.frequencyHours <= 0:
            raise ValidationError({"frequencyHours": "La frecuencia en horas debe ser mayor a cero."})
        if self.quantityDose is not None and self.quantityDose <= 0:
            raise ValidationError({"quantityDose": "La cantidad por dosis debe ser mayor a cero."})

        if self.startDate and self.frequencyHours and self.quantityDose:
            computed_end_date = calculate_medication_end_date(
                self.startDate, self.frequencyHours, self.quantityDose
            )
            if computed_end_date:
                self.endDate = computed_end_date

        if self.endDate and self.startDate and self.endDate < self.startDate:
            raise ValidationError({"endDate": "La fecha de fin no puede ser anterior a la fecha de inicio."})

    def save(self, *args, **kwargs):
        if self.startDate and self.frequencyHours and self.quantityDose:
            computed_end_date = calculate_medication_end_date(
                self.startDate, self.frequencyHours, self.quantityDose
            )
            if computed_end_date:
                self.endDate = computed_end_date
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.pet.name} - {self.medication.name} (Cada {self.frequencyHours}hs)"