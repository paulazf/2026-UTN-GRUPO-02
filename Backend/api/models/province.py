from django.db import models


class Province(models.Model):
    idProvince = models.AutoField(primary_key=True, db_column="idProvince")
    name = models.CharField(max_length=100, unique=True, db_column="name")

    class Meta:
        db_table = "province"
        ordering = ["name"]

    def __str__(self):
        return self.name

