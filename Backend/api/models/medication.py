from django.db import models
from django.db.models.functions import Lower

class Medication(models.Model):
    idMedication = models.AutoField(primary_key=True, db_column="idMedication")
    name = models.CharField(max_length=100)
    dose = models.DecimalField(
        max_digits=6, 
        decimal_places=3 
    )
    description = models.TextField(
        blank=True, 
        null=True
    )
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medication"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower('name'), 'dose',
                condition=models.Q(isDeleted=False),
                name='unique_active_medication_case_insensitive'
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.dose}"