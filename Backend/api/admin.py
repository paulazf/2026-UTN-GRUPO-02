from django.contrib import admin
from .models import Breed, Disease, MedicalTest, Medication, Pet


@admin.register(Breed)
class BreedAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "species")
    list_filter = ("species",)
    search_fields = ("name",)


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "isDeleted")
    list_filter = ("isDeleted",)
    search_fields = ("name",)


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "breed", "idOwner", "birthDate", "age", "weight", "neutered", "isDeleted")
    list_filter = ("isDeleted", "neutered", "breed__species")
    search_fields = ("name", "idOwner")

@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("idMedication", "name", "dose", "description", "isDeleted")
    list_filter = ("isDeleted",)
    search_fields = ("name",)


@admin.register(MedicalTest)
class MedicalTestAdmin(admin.ModelAdmin):
    list_display = ("idMedicalTest", "name", "pet", "type", "date", "status", "isDeleted")
    list_filter = ("type", "status", "isDeleted")
    search_fields = ("name", "pet__name", "veterinarian")
