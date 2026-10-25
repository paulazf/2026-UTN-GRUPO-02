from django.core.exceptions import ValidationError
from django.db import models

from .address import Address
from .pet import Pet


class Appointment(models.Model):
    idAppointment = models.AutoField(primary_key=True, db_column="idAppointment")
    pet = models.ForeignKey(
        Pet,
        on_delete=models.PROTECT,
        related_name="appointments",
        db_column="idPet",
    )
    address = models.ForeignKey(
        Address,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
        db_column="idAddress",
    )
    date = models.DateField(db_column="date")
    time = models.TimeField(db_column="time")
    veterinarian = models.CharField(max_length=150, db_column="veterinarian")
    description = models.TextField(null=True, blank=True, db_column="description")
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "appointment"
        ordering = ["-date", "-time", "-idAppointment"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "date", "time"],
                condition=models.Q(isDeleted=False),
                name="unique_active_appointment_pet_datetime",
            )
        ]

    def __str__(self):
        return f"Turno {self.pet.name} con {self.veterinarian} el {self.date} {self.time}"

