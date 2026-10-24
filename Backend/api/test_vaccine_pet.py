"""Tests de VaccinePet (TDD-0028, TDD-0029, TDD-0030, TDD-0031)."""

from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Breed, Owner, Pet, Vaccine, VaccinePet

URL = "/api/v1/vaccine-pets/"
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


class VaccinePetBase(APITestCase):
    def setUp(self):
        self.owner, token = make_user("duenio@email.com")
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        self.other_owner, self.other_token = make_user("otro@email.com")

        self.luna = make_pet("Luna", self.owner, "CAT")
        self.beto = make_pet("Beto", self.owner, "DOG")
        self.deleted_pet = make_pet("Michi", self.owner, "CAT", isDeleted=True)
        self.foreign_pet = make_pet("Ajeno", self.other_owner, "CAT")

        # productos del seed
        self.triple = Vaccine.objects.get(name="Triple Felina")
        self.rabies = Vaccine.objects.get(name="Antirrábica")
        self.frontline = Vaccine.objects.get(name="Frontline Plus")
        self.deleted_vaccine = Vaccine.objects.create(name="Vieja", laboratory="X", type="VACCINE", isDeleted=True)

    def payload(self, **overrides):
        data = {
            "idPet": self.luna.pk,
            "idVaccine": self.triple.pk,
            "doseNumber": 1,
            "applicationDate": days(-10).isoformat(),
            "expirationDate": days(355).isoformat(),
            "notes": "",
        }
        data.update(overrides)
        return {k: v for k, v in data.items() if v is not None}

    def post(self, **overrides):
        return self.client.post(URL, self.payload(**overrides), format="json")

    def make(self, pet=None, vaccine=None, applied=-10, expires=355, **fields):
        return VaccinePet.objects.create(
            pet=pet or self.luna,
            vaccine=vaccine or self.triple,
            doseNumber=fields.pop("doseNumber", 1),
            applicationDate=days(applied),
            expirationDate=days(expires),
            **fields,
        )


# ---------------------------------------------------------------- TDD-0028 Alta
class CreateVaccinePetTests(VaccinePetBase):
    def test_alta_de_vacuna(self):
        r = self.post()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["vaccineName"], "Triple Felina")
        self.assertEqual(r.data["petName"], "Luna")
        self.assertEqual(r.data["vaccineType"], "VACCINE")
        self.assertEqual(r.data["status"], "VALID")

    def test_alta_de_pipeta_sin_dosis(self):
        r = self.post(idVaccine=self.frontline.pk, doseNumber=None, expirationDate=days(20).isoformat())
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIsNone(r.data["doseNumber"])

    def test_producto_para_ambas_especies(self):
        self.assertEqual(self.post(idVaccine=self.rabies.pk).status_code, 201)
        self.assertEqual(self.post(idPet=self.beto.pk, idVaccine=self.rabies.pk).status_code, 201)

    def test_refuerzo(self):
        self.assertEqual(self.post(applicationDate=days(-400).isoformat(), expirationDate=days(-35).isoformat()).status_code, 201)
        self.assertEqual(self.post(doseNumber=2).status_code, 201)

    def test_vacuna_sin_dosis(self):
        r = self.post(doseNumber=None)
        self.assertEqual(r.status_code, 400)
        self.assertIn("doseNumber", r.data)

    def test_dosis_invalida(self):
        self.assertEqual(self.post(doseNumber=0).status_code, 400)

    def test_especie_incompatible(self):
        r = self.post(idPet=self.beto.pk)  # Triple Felina a un perro
        self.assertEqual(r.status_code, 400)
        self.assertIn("idVaccine", r.data)

    def test_aplicacion_futura(self):
        self.assertEqual(self.post(applicationDate=days(1).isoformat(), expirationDate=days(400).isoformat()).status_code, 400)

    def test_vencimiento_invalido(self):
        self.assertEqual(self.post(expirationDate=days(-10).isoformat()).status_code, 400)
        self.assertEqual(self.post(expirationDate=days(-20).isoformat()).status_code, 400)

    def test_campos_obligatorios_faltantes(self):
        for field in ("idPet", "idVaccine", "applicationDate", "expirationDate"):
            self.assertEqual(self.post(**{field: None}).status_code, 400, field)

    def test_mascota_inexistente_o_dada_de_baja(self):
        self.assertEqual(self.post(idPet=99999).status_code, 404)
        self.assertEqual(self.post(idPet=self.deleted_pet.pk).status_code, 404)

    def test_mascota_ajena(self):
        self.assertEqual(self.post(idPet=self.foreign_pet.pk).status_code, 404)

    def test_producto_inexistente_o_dado_de_baja(self):
        self.assertEqual(self.post(idVaccine=99999).status_code, 404)
        self.assertEqual(self.post(idVaccine=self.deleted_vaccine.pk).status_code, 404)

    def test_duplicado_activo(self):
        self.assertEqual(self.post().status_code, 201)
        self.assertEqual(self.post().status_code, 409)

    def test_duplicado_de_registro_dado_de_baja(self):
        self.make(applied=-10, isDeleted=True)
        self.assertEqual(self.post().status_code, 201)

    def test_sin_autenticacion(self):
        self.client.credentials()
        self.assertEqual(self.post().status_code, 401)


# ---------------------------------------------------------------- TDD-0029 Consulta
class ListVaccinePetTests(VaccinePetBase):
    def test_listado_por_mascota_ordenado(self):
        self.make(applied=-100, expires=265)
        self.make(vaccine=self.rabies, applied=-5, expires=360)
        self.make(vaccine=self.frontline, applied=-50, expires=-20, doseNumber=None)
        r = self.client.get(URL, {"idPet": self.luna.pk})
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["vaccineName"] for x in r.data], ["Antirrábica", "Frontline Plus", "Triple Felina"])

    def test_mascota_sin_aplicaciones(self):
        self.assertEqual(self.client.get(URL, {"idPet": self.luna.pk}).data, [])

    def test_excluye_eliminadas(self):
        self.make(isDeleted=True)
        self.assertEqual(self.client.get(URL, {"idPet": self.luna.pk}).data, [])

    def test_todas_mis_mascotas(self):
        self.make()
        self.make(pet=self.beto, vaccine=self.rabies)
        self.make(pet=self.foreign_pet)
        r = self.client.get(URL)
        self.assertEqual({x["petName"] for x in r.data}, {"Luna", "Beto"})

    def test_estados(self):
        valid = self.make(vaccine=self.triple, expires=31)
        expiring = self.make(vaccine=self.rabies, expires=30)
        expiring_today = self.make(pet=self.beto, vaccine=self.rabies, expires=0)
        expired = self.make(vaccine=self.frontline, applied=-40, expires=-1, doseNumber=None)
        statuses = {x["idVaccinePet"]: x["status"] for x in self.client.get(URL).data}
        self.assertEqual(statuses[valid.pk], "VALID")
        self.assertEqual(statuses[expiring.pk], "EXPIRING")
        self.assertEqual(statuses[expiring_today.pk], "EXPIRING")
        self.assertEqual(statuses[expired.pk], "EXPIRED")

    def test_estado_renovada(self):
        old = self.make(applied=-400, expires=-35)
        new = self.make(applied=-35, expires=330, doseNumber=2)
        statuses = {x["idVaccinePet"]: x["status"] for x in self.client.get(URL).data}
        self.assertEqual(statuses[old.pk], "RENEWED")
        self.assertEqual(statuses[new.pk], "VALID")

    def test_latest(self):
        self.make(applied=-400, expires=-35)
        new = self.make(applied=-35, expires=330, doseNumber=2)
        r = self.client.get(URL, {"idPet": self.luna.pk, "latest": "true"})
        self.assertEqual([x["idVaccinePet"] for x in r.data], [new.pk])

    def test_status_expired_no_cuenta_renovadas(self):
        self.make(applied=-400, expires=-35)  # vencida pero renovada
        self.make(applied=-35, expires=330, doseNumber=2)
        expired = self.make(vaccine=self.rabies, applied=-400, expires=-5)
        r = self.client.get(URL, {"status": "EXPIRED"})
        self.assertEqual([x["idVaccinePet"] for x in r.data], [expired.pk])

    def test_status_expiring_y_valid(self):
        expiring = self.make(expires=10)
        valid = self.make(vaccine=self.rabies, expires=200)
        self.assertEqual([x["idVaccinePet"] for x in self.client.get(URL, {"status": "EXPIRING"}).data], [expiring.pk])
        self.assertEqual([x["idVaccinePet"] for x in self.client.get(URL, {"status": "VALID"}).data], [valid.pk])

    def test_filtro_por_tipo(self):
        self.make()
        pipeta = self.make(vaccine=self.frontline, doseNumber=None, expires=20)
        r = self.client.get(URL, {"type": "EXTERNAL_ANTIPARASITIC"})
        self.assertEqual([x["idVaccinePet"] for x in r.data], [pipeta.pk])

    def test_detalle_propio(self):
        vp = self.make()
        r = self.client.get(detail(vp.pk))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["daysToExpiration"], 355)

    def test_parametros_invalidos(self):
        for params in ({"idPet": "abc"}, {"status": "OK"}, {"type": "PIPETA"}, {"latest": "si"}):
            self.assertEqual(self.client.get(URL, params).status_code, 400, params)

    def test_idpet_ajeno_inexistente_o_dado_de_baja(self):
        for pk in (self.foreign_pet.pk, 99999, self.deleted_pet.pk):
            self.assertEqual(self.client.get(URL, {"idPet": pk}).status_code, 404, pk)

    def test_detalle_inexistente_eliminado_o_ajeno(self):
        removed = self.make(isDeleted=True)
        foreign = self.make(pet=self.foreign_pet)
        for pk in (99999, removed.pk, foreign.pk):
            self.assertEqual(self.client.get(detail(pk)).status_code, 404, pk)

    def test_sin_autenticacion(self):
        self.client.credentials()
        self.assertEqual(self.client.get(URL).status_code, 401)


# ---------------------------------------------------------------- TDD-0030 Modificación
class UpdateVaccinePetTests(VaccinePetBase):
    def patch(self, pk, data):
        return self.client.patch(detail(pk), data, format="json")

    def test_cambio_de_vencimiento_recalcula_estado(self):
        vp = self.make(expires=355)
        r = self.patch(vp.pk, {"expirationDate": days(5).isoformat()})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "EXPIRING")

    def test_cambio_de_dosis_y_notas(self):
        vp = self.make()
        r = self.patch(vp.pk, {"doseNumber": 2, "notes": "  Refuerzo anual  "})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["doseNumber"], 2)
        self.assertEqual(r.data["notes"], "Refuerzo anual")

    def test_put_completo(self):
        vp = self.make()
        r = self.client.put(detail(vp.pk), self.payload(doseNumber=3), format="json")
        self.assertEqual(r.status_code, 200, r.data)

    def test_mismos_ids_en_el_body(self):
        vp = self.make()
        r = self.patch(vp.pk, {"idPet": self.luna.pk, "idVaccine": self.triple.pk, "notes": "ok"})
        self.assertEqual(r.status_code, 200)

    def test_cambio_de_mascota_o_producto(self):
        vp = self.make()
        self.assertEqual(self.patch(vp.pk, {"idPet": self.beto.pk}).status_code, 400)
        self.assertEqual(self.patch(vp.pk, {"idVaccine": self.rabies.pk}).status_code, 400)

    def test_vencimiento_antes_de_la_aplicacion(self):
        vp = self.make(applied=-10)
        self.assertEqual(self.patch(vp.pk, {"expirationDate": days(-20).isoformat()}).status_code, 400)

    def test_aplicacion_futura(self):
        vp = self.make()
        self.assertEqual(self.patch(vp.pk, {"applicationDate": days(1).isoformat()}).status_code, 400)

    def test_quitar_la_dosis_a_una_vacuna(self):
        vp = self.make()
        self.assertEqual(self.patch(vp.pk, {"doseNumber": None}).status_code, 400)

    def test_fecha_que_duplica_otra_aplicacion(self):
        self.make(applied=-100, expires=265)
        vp = self.make(applied=-10, doseNumber=2)
        self.assertEqual(self.patch(vp.pk, {"applicationDate": days(-100).isoformat()}).status_code, 409)

    def test_inexistente_eliminado_o_ajeno(self):
        removed = self.make(isDeleted=True)
        foreign = self.make(pet=self.foreign_pet)
        for pk in (99999, removed.pk, foreign.pk):
            self.assertEqual(self.patch(pk, {"notes": "x"}).status_code, 404, pk)


# ---------------------------------------------------------------- TDD-0031 Baja lógica
class DeleteVaccinePetTests(VaccinePetBase):
    def test_baja_correcta(self):
        vp = self.make()
        self.assertEqual(self.client.delete(detail(vp.pk)).status_code, 204)
        vp.refresh_from_db()
        self.assertTrue(vp.isDeleted)

    def test_listado_y_contadores_tras_la_baja(self):
        vp = self.make(applied=-400, expires=-5)
        self.client.delete(detail(vp.pk))
        self.assertEqual(self.client.get(URL, {"idPet": self.luna.pk}).data, [])
        self.assertEqual(self.client.get(URL, {"status": "EXPIRED"}).data, [])

    def test_baja_de_la_ultima_dosis_reactiva_la_anterior(self):
        old = self.make(applied=-400, expires=-35)
        new = self.make(applied=-35, expires=330, doseNumber=2)
        self.client.delete(detail(new.pk))
        r = self.client.get(detail(old.pk))
        self.assertEqual(r.data["status"], "EXPIRED")

    def test_detalle_o_edicion_tras_la_baja(self):
        vp = self.make()
        self.client.delete(detail(vp.pk))
        self.assertEqual(self.client.get(detail(vp.pk)).status_code, 404)
        self.assertEqual(self.client.patch(detail(vp.pk), {"notes": "x"}, format="json").status_code, 404)

    def test_inexistente_o_ya_eliminado(self):
        removed = self.make(isDeleted=True)
        self.assertEqual(self.client.delete(detail(99999)).status_code, 404)
        self.assertEqual(self.client.delete(detail(removed.pk)).status_code, 404)

    def test_aplicacion_de_mascota_ajena(self):
        foreign = self.make(pet=self.foreign_pet)
        self.assertEqual(self.client.delete(detail(foreign.pk)).status_code, 404)
        foreign.refresh_from_db()
        self.assertFalse(foreign.isDeleted)

    def test_sin_autenticacion(self):
        vp = self.make()
        self.client.credentials()
        self.assertEqual(self.client.delete(detail(vp.pk)).status_code, 401)
