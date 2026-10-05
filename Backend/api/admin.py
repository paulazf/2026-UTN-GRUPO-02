from django.contrib import admin
from .models import Breed, MedicalTest, Pet


@admin.register(Breed)
class BreedAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "species")
    list_filter = ("species",)
    search_fields = ("name",)


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "breed", "idOwner", "birthDate", "age", "weight", "neutered", "isDeleted")
    list_filter = ("isDeleted", "neutered", "breed__species")
    search_fields = ("name", "idOwner")


@admin.register(MedicalTest)
class MedicalTestAdmin(admin.ModelAdmin):
    list_display = ("idMedicalTest", "name", "pet", "type", "date", "status", "isDeleted")
    list_filter = ("type", "status", "isDeleted")
    search_fields = ("name", "pet__name", "veterinarian")
