from django.db import models

from .province import Province


class City(models.Model):
    idCity = models.AutoField(primary_key=True, db_column="idCity")
    province = models.ForeignKey(
        Province,
        on_delete=models.PROTECT,
        related_name="cities",
        db_column="idProvince",
    )
    name = models.CharField(max_length=150, db_column="name")

    class Meta:
        db_table = "city"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["province", "name"],
                name="unique_city_per_province",
            )
        ]

    def __str__(self):
        return f"{self.name}, {self.province.name}"

