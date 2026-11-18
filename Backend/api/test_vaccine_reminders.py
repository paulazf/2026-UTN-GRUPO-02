"""
Tests de recordatorios de vencimiento de vacunas y antiparasitarios (TDD-0050).
"""

from datetime import date, timedelta
from rest_framework import status

from .models import Vaccine, VaccinePet
from .test_vaccine_pet import URL, VaccinePetBase, days, detail

REMINDERS_URL = f"{URL}reminders/"


class VaccineRemindersTests(VaccinePetBase):
    def test_devuelve_vacunas_proximas_a_vencer(self):
        """Devuelve aplicaciones vigentes que vencerán a futuro de todas las mascotas activas."""
        self.make(pet=self.luna, vaccine=self.triple, applied=-300, expires=65)
        self.make(pet=self.beto, vaccine=self.rabies, applied=-358, expires=7)

        response = self.client.get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual({v["petName"] for v in response.data}, {"Luna", "Beto"})
        self.assertIn("expirationDate", response.data[0])

    def test_excluye_vacunas_con_refuerzo_posterior(self):
        """
        Escenario 2 (TDD-0050): Ya se aplicó el refuerzo.
        DADO que el dueño registró el refuerzo antes del aviso
        CUANDO llega la fecha del aviso
        ENTONCES no recibe nada (la aplicación anterior con hasNewer=True se excluye).
        """
        # Primera dosis hace 1 año, vence hoy
        self.make(pet=self.beto, vaccine=self.rabies, applied=-365, expires=0)
        # Refuerzo aplicado ayer, vence dentro de 1 año
        self.make(pet=self.beto, vaccine=self.rabies, applied=-1, expires=364)

        response = self.client.get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Solo debe figurar el refuerzo nuevo (que vence dentro de 364 días), no la dosis vieja
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["daysToExpiration"], 364)

    def test_excluye_mascotas_dadas_de_baja(self):
        """
        Escenario 3 (TDD-0050): Mascota dada de baja.
        DADO que Beto fue dado de baja (isDeleted=True)
        CUANDO llega la fecha
        ENTONCES no se envía el aviso (se excluyen sus aplicaciones).
        """
        self.make(pet=self.deleted_pet, vaccine=self.triple, applied=-358, expires=7)

        response = self.client.get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_excluye_vacunas_ya_vencidas_en_el_pasado(self):
        """Vacunas cuya fecha de vencimiento ya expiró antes de hoy no generan recordatorio."""
        self.make(pet=self.luna, vaccine=self.triple, applied=-400, expires=-5)

        response = self.client.get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_excluye_vacunas_eliminadas(self):
        """Aplicaciones eliminadas lógicamente (isDeleted=True) no generan avisos."""
        app = self.make(pet=self.luna, vaccine=self.triple, applied=-300, expires=15)
        self.client.delete(detail(app.pk))

        response = self.client.get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_excluye_mascotas_ajenas(self):
        """No devuelve vacunas de mascotas pertenecientes a otros dueños."""
        self.make(pet=self.foreign_pet, vaccine=self.triple, applied=-300, expires=15)

        response = self.client.get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_requiere_autenticacion(self):
        """Endpoint protegido por Token de autenticación."""
        self.client.credentials()  # Quita token
        response = self.client.get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
