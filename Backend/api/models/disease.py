from django.db import models
from django.db.models.functions import Lower


class Disease(models.Model):
    name = models.CharField(max_length=100)
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "disease"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                condition=models.Q(isDeleted=False),
                name="unique_active_disease_name_case_insensitive",
            )
        ]

    def __str__(self):
        return self.name
