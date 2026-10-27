from datetime import date
from django.core.exceptions import ValidationError
from django.db import models

from .pet import Pet


class FeedingType(models.TextChoices):
    DRY_FOOD = "DRY_FOOD", "Alimento seco"
    WET_FOOD = "WET_FOOD", "Alimento húmedo"
    VETERINARY_DIET = "VETERINARY_DIET", "Dieta veterinaria"
    HOMEMADE = "HOMEMADE", "Dieta casera"
    MIXED = "MIXED", "Alimentación mixta"


class Feeding(models.Model):

    idFeeding = models.AutoField(primary_key=True, db_column="idFeeding")
    pet = models.ForeignKey(
        Pet,
        on_delete=models.PROTECT,
        related_name="feedings",
        db_column="idPet",
    )
    food = models.CharField(max_length=150, help_text="Nombre o marca del alimento")
    type = models.CharField(max_length=30, choices=FeedingType.choices)
    portion = models.CharField(blank=True, max_length=100, help_text="Ej: '80g', '1 taza'")
    sinceDate = models.DateField(db_column="sinceDate")
    frequency = models.CharField(blank=True, max_length=100, help_text="Ej: '2 veces al día'")
    notes = models.TextField(blank=True, default="", null=True)
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "feeding"
        ordering = ["-sinceDate", "-idFeeding"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "food", "sinceDate"],
                condition=models.Q(isDeleted=False),
                name="unique_active_feeding_per_pet",
            )
        ]

    def clean(self):
        if self.sinceDate and self.sinceDate > date.today():
            raise ValidationError({"sinceDate": "La fecha de inicio no puede ser futura."})

    def __str__(self):
        return f"{self.pet.name} - {self.food} ({self.get_type_display()})"

