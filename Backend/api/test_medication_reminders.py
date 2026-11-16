"""Tests de avisos de medicación (TDD-0047, HU-304)."""

from datetime import time

from django.db import connection

from .models import MedicationPet
from .test_medication_pet import URL, MedicationPetBase, days, detail

REMINDERS_URL = f"{URL}reminders/"


class StartTimeTests(MedicationPetBase):
    def test_alta_sin_hora_usa_las_9(self):
        r = self.post()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["startTime"], "09:00")

    def test_alta_con_hora(self):
        r = self.post(startTime="21:30")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["startTime"], "21:30")

    def test_alta_hora_invalida(self):
        r = self.post(startTime="25:00")
        self.assertEqual(r.status_code, 400)
        self.assertIn("startTime", r.data)

    def test_modificar_hora(self):
        created = self.post().data
        r = self.client.patch(detail(created["id"]), {"startTime": "08:15"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["startTime"], "08:15")


    def test_alta_sin_campo_en_el_codigo_usa_default_de_la_base(self):
        """Código que no conoce startTime (ej. main) puede crear tratamientos: la base pone 09:00."""
        with connection.cursor() as cursor:
            cursor.execute(
                'INSERT INTO medication_pet ("idPet", "idMedication", "frequencyHours", "quantityDose", '
                '"startDate", "endDate", "isDeleted", created_at, updated_at) '
                "VALUES (%s, %s, 8, 3, %s, %s, false, %s, %s)",
                [self.luna.pk, self.amoxicilina.pk, days(0), days(1), days(0), days(0)],
            )
        self.assertEqual(MedicationPet.objects.get(pet=self.luna).startTime, time(9, 0))


class RemindersTests(MedicationPetBase):
    def test_devuelve_tratamientos_activos_de_todas_las_mascotas(self):
        self.post(idPet=self.luna.pk)
        self.post(idPet=self.beto.pk, idMedication=self.cefalexina.pk)
        r = self.client.get(REMINDERS_URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual({t["petName"] for t in r.data}, {"Luna", "Beto"})
        self.assertIn("startTime", r.data[0])

    def test_excluye_tratamientos_terminados(self):
        # 1 toma cada 8 hs hace 3 días: terminó ese mismo día
        self.post(startDate=days(-3).isoformat(), frequencyHours=8, quantityDose=1)
        r = self.client.get(REMINDERS_URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, [])

    def test_excluye_tratamientos_eliminados(self):
        created = self.post().data
        self.client.delete(detail(created["id"]))
        r = self.client.get(REMINDERS_URL)
        self.assertEqual(r.data, [])

    def test_excluye_mascotas_eliminadas_y_ajenas(self):
        MedicationPet.objects.create(
            pet=self.deleted_pet, medication=self.amoxicilina,
            frequencyHours=8, quantityDose=8, startDate=days(0),
        )
        MedicationPet.objects.create(
            pet=self.foreign_pet, medication=self.amoxicilina,
            frequencyHours=8, quantityDose=8, startDate=days(0),
        )
        r = self.client.get(REMINDERS_URL)
        self.assertEqual(r.data, [])

    def test_no_pide_id_pet(self):
        r = self.client.get(REMINDERS_URL)
        self.assertEqual(r.status_code, 200)

    def test_requiere_autenticacion(self):
        self.client.credentials()
        r = self.client.get(REMINDERS_URL)
        self.assertIn(r.status_code, (401, 403))
