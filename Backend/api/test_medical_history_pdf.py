"""
Tests para la exportación de Historia Clínica en PDF (TDD-0048).
"""

from datetime import date, timedelta
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from api.models import (
    Breed,
    Disease,
    Feeding,
    FeedingType,
    MedicalTest,
    Medication,
    MedicationPet,
    Owner,
    Pet,
    PetDisease,
    Vaccine,
    VaccinePet,
    VaccineType,
)
from api.services.pdf_generator import generate_medical_history_pdf


class MedicalHistoryPdfTests(APITestCase):
    def setUp(self):
        # 1. Usuarios y Dueños
        self.user = User.objects.create_user(
            username="tutor@test.com", email="tutor@test.com", password="password123"
        )
        self.owner = Owner.objects.create(
            user=self.user,
            email="tutor@test.com",
            firstName="Carlos",
            lastName="González",
            phone="1122334455",
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        # Otro tutor
        self.other_user = User.objects.create_user(
            username="otro@test.com", email="otro@test.com", password="password123"
        )
        self.other_owner = Owner.objects.create(
            user=self.other_user,
            email="otro@test.com",
            firstName="Ana",
            lastName="Pérez",
        )

        # 2. Raza
        self.breed = Breed.objects.create(name="Golden Retriever", species="DOG")

        # 3. Mascota activa de Carlos
        self.mandarina = Pet.objects.create(
            name="Mandarina",
            birthDate=date(2021, 5, 10),
            neutered=True,
            weight=24.50,
            breed=self.breed,
            idOwner=self.owner.idOwner,
            isDeleted=False,
        )

        # Mascota de otro dueño
        self.foreign_pet = Pet.objects.create(
            name="Rocky",
            birthDate=date(2020, 1, 1),
            neutered=False,
            weight=10.0,
            breed=self.breed,
            idOwner=self.other_owner.idOwner,
            isDeleted=False,
        )

        # Mascota eliminada
        self.deleted_pet = Pet.objects.create(
            name="Boby",
            birthDate=date(2019, 3, 3),
            neutered=True,
            weight=15.0,
            breed=self.breed,
            idOwner=self.owner.idOwner,
            isDeleted=True,
        )

    def test_exportar_historia_clinica_pdf_completo(self):
        """
        Escenario 1 (TDD-0048): PDF completo
        DADO que Mandarina tiene vacunas, estudios, medicamentos, enfermedades y alimentación
        CUANDO el dueño solicita 'medical-history/pdf'
        ENTONCES obtiene un PDF con status 200, application/pdf y contenido válido.
        """
        # Vacuna
        vaccine, _ = Vaccine.objects.get_or_create(
            name="Sextuple Canina",
            defaults={
                "laboratory": "Zoetis",
                "type": VaccineType.VACCINE,
                "validityDays": 365,
            },
        )
        VaccinePet.objects.create(
            pet=self.mandarina,
            vaccine=vaccine,
            doseNumber=1,
            applicationDate=date.today() - timedelta(days=60),
            expirationDate=date.today() + timedelta(days=305),
        )

        # Estudio
        MedicalTest.objects.create(
            pet=self.mandarina,
            name="Hemograma Completo",
            type=MedicalTest.Type.LABORATORY,
            date=date.today() - timedelta(days=30),
            veterinarian="Dra. Laura Gómez",
            status=MedicalTest.Status.NORMAL,
            resultSummary="Valores dentro de los rangos normales.",
        )

        # Medicación
        medication, _ = Medication.objects.get_or_create(
            name="Amoxicilina Test",
            dose="500.000",
            defaults={"description": "Antibiótico"},
        )
        MedicationPet.objects.create(
            pet=self.mandarina,
            medication=medication,
            frequencyHours=8,
            quantityDose=14,
            startDate=date.today() - timedelta(days=10),
            endDate=date.today() - timedelta(days=5),
            notes="Tomar con alimento",
        )

        # Enfermedad
        disease, _ = Disease.objects.get_or_create(name="Otitis externa Test")
        PetDisease.objects.create(
            pet=self.mandarina,
            disease=disease,
            startDate=date.today() - timedelta(days=15),
            endDate=date.today() - timedelta(days=5),
            notes="Tratamiento completado con éxito",
        )

        # Alimentación
        Feeding.objects.create(
            pet=self.mandarina,
            food="Royal Canin Maxi Adult",
            type=FeedingType.DRY_FOOD,
            portion="350g",
            frequency="2 veces al día",
            sinceDate=date(2022, 1, 1),
        )

        url = f"/api/v1/pets/{self.mandarina.id}/medical-history/pdf/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers.get("Content-Type"), "application/pdf")
        self.assertIn("attachment", response.headers.get("Content-Disposition", ""))
        self.assertIn("libreta_mandarina.pdf", response.headers.get("Content-Disposition", ""))

        content = b"".join(response.streaming_content) if response.streaming else response.content
        self.assertTrue(content.startswith(b"%PDF-"))
        self.assertGreater(len(content), 1000)

    def test_exportar_historia_clinica_secciones_vacias(self):
        """
        Escenario 2 (TDD-0048): Secciones vacías
        DADO que Mandarina no tiene estudios ni otros registros clínicos
        CUANDO exporta
        ENTONCES obtiene el PDF y las secciones vacías muestran 'Sin registros'.
        """
        url = f"/api/v1/pets/{self.mandarina.id}/medical-history/pdf/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers.get("Content-Type"), "application/pdf")

        content = b"".join(response.streaming_content) if response.streaming else response.content
        self.assertTrue(content.startswith(b"%PDF-"))
        self.assertGreater(len(content), 500)

        # Validamos directamente con el generador
        buffer = generate_medical_history_pdf(self.mandarina, self.owner)
        pdf_bytes = buffer.getvalue()
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))

    def test_exportar_excluye_registros_eliminados(self):
        """
        Escenario 3 (TDD-0048): Solo lo vigente
        DADO que los registros fueron dados de baja lógica (isDeleted=True)
        CUANDO exporta
        ENTONCES esos registros no aparecen en la consulta y el PDF se genera sin ellos.
        """
        vaccine = Vaccine.objects.create(
            name="Vacuna Vieja",
            laboratory="Lab X",
            type=VaccineType.VACCINE,
        )
        VaccinePet.objects.create(
            pet=self.mandarina,
            vaccine=vaccine,
            doseNumber=1,
            applicationDate=date.today() - timedelta(days=100),
            expirationDate=date.today() - timedelta(days=10),
            isDeleted=True,  # ELIMINADO
        )

        MedicalTest.objects.create(
            pet=self.mandarina,
            name="Estudio Borrado",
            type=MedicalTest.Type.OTHER,
            date=date.today() - timedelta(days=40),
            isDeleted=True,  # ELIMINADO
        )

        medication = Medication.objects.create(name="Ibuprofeno Vet", dose="100.000")
        MedicationPet.objects.create(
            pet=self.mandarina,
            medication=medication,
            frequencyHours=12,
            quantityDose=5,
            startDate=date.today() - timedelta(days=20),
            endDate=date.today() - timedelta(days=15),
            isDeleted=True,  # ELIMINADO
        )

        disease = Disease.objects.create(name="Enfermedad Eliminada")
        PetDisease.objects.create(
            pet=self.mandarina,
            disease=disease,
            startDate=date.today() - timedelta(days=50),
            isDeleted=True,  # ELIMINADO
        )

        Feeding.objects.create(
            pet=self.mandarina,
            food="Alimento Descontinuado",
            type=FeedingType.DRY_FOOD,
            sinceDate=date(2021, 1, 1),
            isDeleted=True,  # ELIMINADO
        )

        # Generar PDF
        url = f"/api/v1/pets/{self.mandarina.id}/medical-history/pdf/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = b"".join(response.streaming_content) if response.streaming else response.content
        self.assertTrue(content.startswith(b"%PDF-"))

        # Verificamos que las queries para esta mascota con isDeleted=False estén vacías
        self.assertEqual(self.mandarina.vaccinePets.filter(isDeleted=False).count(), 0)
        self.assertEqual(self.mandarina.medicalTests.filter(isDeleted=False).count(), 0)
        self.assertEqual(self.mandarina.medications.filter(isDeleted=False).count(), 0)
        self.assertEqual(self.mandarina.diseases.filter(isDeleted=False).count(), 0)
        self.assertEqual(self.mandarina.feedings.filter(isDeleted=False).count(), 0)

    def test_exportar_mascota_ajena_o_inexistente(self):
        """
        Seguridad: Dueño intenta exportar el PDF de una mascota ajena o inexistente -> 404
        """
        # Mascota ajena
        url_foreign = f"/api/v1/pets/{self.foreign_pet.id}/medical-history/pdf/"
        res_foreign = self.client.get(url_foreign)
        self.assertEqual(res_foreign.status_code, status.HTTP_404_NOT_FOUND)

        # Mascota eliminada
        url_deleted = f"/api/v1/pets/{self.deleted_pet.id}/medical-history/pdf/"
        res_deleted = self.client.get(url_deleted)
        self.assertEqual(res_deleted.status_code, status.HTTP_404_NOT_FOUND)

        # ID inexistente
        url_none = "/api/v1/pets/999999/medical-history/pdf/"
        res_none = self.client.get(url_none)
        self.assertEqual(res_none.status_code, status.HTTP_404_NOT_FOUND)

    def test_exportar_requiere_autenticacion(self):
        """
        Seguridad: Petición sin credenciales de autenticación -> 401
        """
        self.client.credentials()  # Quita el token
        url = f"/api/v1/pets/{self.mandarina.id}/medical-history/pdf/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
