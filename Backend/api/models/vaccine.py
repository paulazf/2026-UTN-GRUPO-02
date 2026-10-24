from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

from .breed import PetSpecies


class VaccineType(models.TextChoices):
    VACCINE = "VACCINE", "Vacuna"
    EXTERNAL_ANTIPARASITIC = "EXTERNAL_ANTIPARASITIC", "Antiparasitario externo"
    INTERNAL_ANTIPARASITIC = "INTERNAL_ANTIPARASITIC", "Antiparasitario interno"


class Vaccine(models.Model):
    """
    Catálogo de productos que se aplican a las mascotas (TDD-0025):
    vacunas, antiparasitarios externos (pipetas, collares, comprimidos
    antipulgas) y antiparasitarios internos (desparasitación).
    """

    idVaccine = models.AutoField(primary_key=True, db_column="idVaccine")
    name = models.CharField(max_length=100)
    laboratory = models.CharField(max_length=100, blank=True, default="")
    type = models.CharField(max_length=30, choices=VaccineType.choices, default=VaccineType.VACCINE)
    # null = sirve para perros y gatos
    species = models.CharField(max_length=10, choices=PetSpecies.choices, null=True, blank=True)
    # vigencia habitual en días, para precargar el vencimiento en el front
    validityDays = models.PositiveIntegerField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vaccine"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                Lower("laboratory"),
                condition=Q(isDeleted=False),
                name="unique_active_vaccine_name_laboratory",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.laboratory})" if self.laboratory else self.name
