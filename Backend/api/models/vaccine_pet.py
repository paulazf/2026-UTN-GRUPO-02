from django.db import models

from .pet import Pet
from .vaccine import Vaccine


class VaccinePet(models.Model):
    """
    Aplicación de un producto del catálogo (vacuna o antiparasitario) a una mascota (TDD-0028).
    Cada refuerzo es un registro nuevo; por eso la PK es propia y no (pet, vaccine).
    El estado (vigente, por vencer, vencida, renovada) se calcula al consultar (TDD-0029).
    """

    idVaccinePet = models.AutoField(primary_key=True, db_column="idVaccinePet")
    pet = models.ForeignKey(
        Pet,
        on_delete=models.PROTECT,
        related_name="vaccinePets",
        db_column="idPet",
    )
    vaccine = models.ForeignKey(
        Vaccine,
        on_delete=models.PROTECT,
        related_name="applications",
        db_column="idVaccine",
    )
    # obligatorio solo para vacunas; los antiparasitarios no tienen dosis
    doseNumber = models.PositiveSmallIntegerField(null=True, blank=True)
    applicationDate = models.DateField()
    expirationDate = models.DateField()
    notes = models.CharField(max_length=255, blank=True, default="")
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vaccine_pet"
        ordering = ["-applicationDate", "-idVaccinePet"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "vaccine", "applicationDate"],
                condition=models.Q(isDeleted=False),
                name="unique_active_vaccine_application",
            )
        ]

    def __str__(self):
        return f"{self.pet.name} - {self.vaccine.name} ({self.applicationDate})"
