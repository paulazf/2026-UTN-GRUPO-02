from django.db import models

from .city import City
from .owner import Owner


class Address(models.Model):
    idAddress = models.AutoField(primary_key=True, db_column="idAddress")
    owner = models.ForeignKey(
        Owner,
        on_delete=models.CASCADE,
        related_name="addresses",
        db_column="idOwner",
    )
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="addresses",
        db_column="idCity",
    )
    referenceName = models.CharField(max_length=120, db_column="referenceName")
    street = models.CharField(max_length=150, db_column="street")
    number = models.CharField(max_length=20, db_column="number")
    floor = models.IntegerField(null=True, blank=True, db_column="floor")
    apartment = models.CharField(max_length=10, null=True, blank=True, db_column="apartment")
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "address"
        ordering = ["referenceName"]

    def __str__(self):
        return f"{self.referenceName} - {self.street} {self.number}, {self.city.name}"

