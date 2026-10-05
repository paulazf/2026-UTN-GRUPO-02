import os

from django.db import models

from .pet import Pet


def medical_test_upload_path(instance, filename):
    return f"medical_tests/pet_{instance.pet_id}/{os.path.basename(filename)}"


class MedicalTest(models.Model):
    class Type(models.TextChoices):
        LABORATORY = "laboratory", "Laboratorio"
        IMAGING = "imaging", "Imagen"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        NORMAL = "normal", "Normal"
        ALTERED = "altered", "Alterado"
        PENDING = "pending", "Pendiente"

    idMedicalTest = models.AutoField(primary_key=True, db_column="idMedicalTest")
    pet = models.ForeignKey(
        Pet,
        on_delete=models.PROTECT,
        db_column="idPet",
        related_name="medicalTests",
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=Type.choices)
    date = models.DateField()
    veterinarian = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices)
    resultSummary = models.CharField(max_length=100, blank=True, default="")
    resultDetail = models.TextField(max_length=2000, blank=True, default="")
    file = models.FileField(
        upload_to=medical_test_upload_path, max_length=255, null=True, blank=True
    )
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "medical_test"
        ordering = ["-date", "-idMedicalTest"]

    def __str__(self):
        return f"{self.name} ({self.pet_id})"
