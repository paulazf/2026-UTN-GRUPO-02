from django.db import models


class PetSpecies(models.TextChoices):
    DOG = "DOG", "Dog"
    CAT = "CAT", "Cat"


class Breed(models.Model):
    name = models.CharField(max_length=50)
    species = models.CharField(max_length=10, choices=PetSpecies.choices)

    class Meta:
        db_table = "breed"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.species})"
