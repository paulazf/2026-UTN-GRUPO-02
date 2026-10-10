from django.contrib import admin
from .models import Breed, Disease, MedicalTest, MedicalTestFile, Medication, Pet, PetDisease, MedicationPet


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


@admin.register(MedicationPet)
class MedicationPetAdmin(admin.ModelAdmin):
    list_display = ("id", "pet", "medication", "frequencyHours", "quantityDose", "startDate", "isDeleted")
    list_filter = ("isDeleted", "startDate")
    search_fields = ("pet__name", "medication__name")


class MedicalTestFileInline(admin.TabularInline):
    model = MedicalTestFile
    extra = 0


@admin.register(MedicalTest)
class MedicalTestAdmin(admin.ModelAdmin):
    inlines = [MedicalTestFileInline]
    list_display = ("idMedicalTest", "name", "pet", "type", "date", "status", "isDeleted")
    list_filter = ("type", "status", "isDeleted")
    search_fields = ("name", "pet__name", "veterinarian")


@admin.register(PetDisease)
class PetDiseaseAdmin(admin.ModelAdmin):
    list_display = ("id", "pet", "disease", "startDate", "endDate", "is_active", "isDeleted")
    list_filter = ("isDeleted", "startDate", "endDate")
    search_fields = ("pet__name", "disease__name", "notes")
    raw_id_fields = ("pet", "disease")

    @admin.display(boolean=True, description='Activa')
    def is_active(self, obj):
        return obj.endDate is None