"""Tests de MedicationPet (TDD-0021, TDD-0022, TDD-0023, TDD-0024)."""

from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Breed, Medication, MedicationPet, Owner, Pet

URL = "/api/v1/medication-pets/"
TODAY = date.today()


def days(n):
    return TODAY + timedelta(days=n)


def detail(pk):
    return f"{URL}{pk}/"


def make_user(email):
    user = User.objects.create_user(username=email, email=email, password="pwd")
    owner = Owner.objects.create(user=user, email=email, firstName="T", lastName="T")
    token, _ = Token.objects.get_or_create(user=user)
    return owner, token


def make_pet(name, owner, species="CAT", isDeleted=False):
    breed, _ = Breed.objects.get_or_create(name=f"Raza test {species}", species=species)
    return Pet.objects.create(
        name=name, birthDate=date(2023, 3, 15), weight="4.20",
        breed=breed, idOwner=owner.idOwner, isDeleted=isDeleted,
    )


class MedicationPetBase(APITestCase):
    def setUp(self):
        self.owner, token = make_user("duenio_med@email.com")
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        self.other_owner, self.other_token = make_user("otro_med@email.com")

        self.luna = make_pet("Luna", self.owner, "CAT")
        self.beto = make_pet("Beto", self.owner, "DOG")
        self.deleted_pet = make_pet("Michi", self.owner, "CAT", isDeleted=True)
        self.foreign_pet = make_pet("Ajeno", self.other_owner, "CAT")

        # Medicamentos
        self.amoxicilina, _ = Medication.objects.get_or_create(
            name="Amoxicilina 500mg",
            defaults={"dose": "500", "description": "Antibiótico"}
        )
        self.cefalexina, _ = Medication.objects.get_or_create(
            name="Cefalexina 500mg",
            defaults={"dose": "500", "description": "Antibiótico"}
        )
        self.deleted_medication = Medication.objects.create(
            name="Med Obsoleto", dose="100", description="Desc", isDeleted=True
        )

    def payload(self, **overrides):
        data = {
            "idPet": self.luna.pk,
            "idMedication": self.amoxicilina.pk,
            "frequencyHours": 8,
            "quantityDose": 8,
            "startDate": TODAY.isoformat(),
            "notes": "Administrar con comida",
        }
        data.update(overrides)
        return {k: v for k, v in data.items() if v is not None}

    def post(self, **overrides):
        return self.client.post(URL, self.payload(**overrides), format="json")


# ---------------------------------------------------------------- TDD-0021 Alta
class CreateMedicationPetTests(MedicationPetBase):
    def test_alta_exitosa_calcula_end_date(self):
        r = self.post()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["petName"], "Luna")
        self.assertEqual(r.data["medicationName"], "Amoxicilina 500mg")
        expected_end = days(3).isoformat()
        self.assertEqual(r.data["endDate"], expected_end)
        self.assertEqual(r.data["status"], "En tratamiento")
        self.assertFalse(r.data["isDeleted"])

    def test_alta_exacta_24hs_toma_dos_fechas(self):
        r = self.post(frequencyHours=8, quantityDose=3)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["endDate"], days(1).isoformat())

    def test_alta_menos_de_24hs_mismo_dia(self):
        r = self.post(frequencyHours=8, quantityDose=1)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["endDate"], TODAY.isoformat())

    def test_alta_fecha_futura_error(self):
        r = self.post(startDate=days(1).isoformat())
        self.assertEqual(r.status_code, 400)
        self.assertIn("startDate", r.data)

    def test_alta_frecuencia_invalida(self):
        r = self.post(frequencyHours=0)
        self.assertEqual(r.status_code, 400)
        self.assertIn("frequencyHours", r.data)

    def test_alta_dosis_invalida(self):
        r = self.post(quantityDose=-1)
        self.assertEqual(r.status_code, 400)
        self.assertIn("quantityDose", r.data)

    def test_alta_mascota_ajena_o_inexistente(self):
        r = self.post(idPet=self.foreign_pet.pk)
        self.assertEqual(r.status_code, 404)
        r2 = self.post(idPet=99999)
        self.assertEqual(r2.status_code, 404)

    def test_alta_medicamento_inexistente_o_eliminado(self):
        r = self.post(idMedication=self.deleted_medication.pk)
        self.assertEqual(r.status_code, 404)

    def test_duplicado_activo_falla(self):
        self.assertEqual(self.post().status_code, 201)
        # Segundo intento de asignarle el mismo medicamento a la misma mascota cuando aún está en tratamiento
        r2 = self.post(quantityDose=5, frequencyHours=12)
        self.assertEqual(r2.status_code, 409)


# ---------------------------------------------------------------- TDD-0022 Consulta
class GetMedicationPetTests(MedicationPetBase):
    def test_list_por_mascota(self):
        self.post()
        r = self.client.get(f"{URL}?idPet={self.luna.pk}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["petName"], "Luna")

    def test_list_mascota_ajena(self):
        r = self.client.get(f"{URL}?idPet={self.foreign_pet.pk}")
        self.assertEqual(r.status_code, 404)

    def test_list_sin_parametro_id_pet(self):
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------- TDD-0023 Modificación
class UpdateMedicationPetTests(MedicationPetBase):
    def test_modificar_dosis_recalcula_end_date(self):
        res = self.post()
        mp_id = res.data["id"]

        # Cambiamos quantityDose a 4 -> 8x4 = 32 hs -> ceil(32/24) = 2 días -> TODAY + 2 días
        patch_res = self.client.patch(detail(mp_id), {"quantityDose": 4}, format="json")
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data["endDate"], days(2).isoformat())

    def test_no_permitir_cambiar_mascota(self):
        res = self.post()
        mp_id = res.data["id"]
        patch_res = self.client.patch(detail(mp_id), {"idPet": self.beto.pk}, format="json")
        self.assertEqual(patch_res.status_code, 400)


# ---------------------------------------------------------------- TDD-0024 Baja Lógica
class DeleteMedicationPetTests(MedicationPetBase):
    def test_baja_logica(self):
        res = self.post()
        mp_id = res.data["id"]

        del_res = self.client.delete(detail(mp_id))
        self.assertEqual(del_res.status_code, 204)

        mp = MedicationPet.objects.get(pk=mp_id)
        self.assertTrue(mp.isDeleted)
