from django.contrib import admin
from .models import Breed, Pet


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
