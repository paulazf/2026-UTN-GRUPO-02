"""Tests del catálogo Vaccine (TDD-0025, TDD-0026, TDD-0027)."""

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Owner, Vaccine

URL = "/api/v1/vaccines/"


def detail(pk):
    return f"{URL}{pk}/"


class VaccineBase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="vac@email.com", email="vac@email.com", password="pwd")
        Owner.objects.create(user=self.user, email="vac@email.com", firstName="T", lastName="T")
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)

    def payload(self, **overrides):
        data = {
            "name": "Vacuna de prueba",
            "laboratory": "Laboratorio Test",
            "type": "VACCINE",
            "species": "CAT",
            "validityDays": 365,
        }
        data.update(overrides)
        return {k: v for k, v in data.items() if v is not None}

    def make(self, **fields):
        defaults = {"name": "Producto test", "laboratory": "Lab test", "type": "VACCINE"}
        defaults.update(fields)
        return Vaccine.objects.create(**defaults)


# ---------------------------------------------------------------- TDD-0025 Alta y consulta
class CreateVaccineTests(VaccineBase):
    def test_alta_completa(self):
        r = self.client.post(URL, self.payload(), format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertFalse(r.data["isDeleted"])
        self.assertEqual(r.data["species"], "CAT")

    def test_alta_minima(self):
        r = self.client.post(URL, {"name": "Solo nombre", "type": "EXTERNAL_ANTIPARASITIC"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["laboratory"], "")
        self.assertIsNone(r.data["species"])
        self.assertIsNone(r.data["validityDays"])

    def test_nombre_faltante_o_solo_espacios(self):
        self.assertEqual(self.client.post(URL, self.payload(name=None), format="json").status_code, 400)
        self.assertEqual(self.client.post(URL, self.payload(name="   "), format="json").status_code, 400)

    def test_nombre_demasiado_largo(self):
        self.assertEqual(self.client.post(URL, self.payload(name="a" * 101), format="json").status_code, 400)

    def test_tipo_invalido(self):
        self.assertEqual(self.client.post(URL, self.payload(type="PIPETA"), format="json").status_code, 400)

    def test_especie_invalida(self):
        self.assertEqual(self.client.post(URL, self.payload(species="BIRD"), format="json").status_code, 400)

    def test_vigencia_invalida(self):
        self.assertEqual(self.client.post(URL, self.payload(validityDays=0), format="json").status_code, 400)
        self.assertEqual(self.client.post(URL, self.payload(validityDays=-5), format="json").status_code, 400)

    def test_duplicado_exacto(self):
        self.assertEqual(self.client.post(URL, self.payload(), format="json").status_code, 201)
        self.assertEqual(self.client.post(URL, self.payload(), format="json").status_code, 409)

    def test_duplicado_con_mayusculas_y_espacios(self):
        self.client.post(URL, self.payload(), format="json")
        r = self.client.post(URL, self.payload(name=" vacuna DE prueba ", laboratory="LABORATORIO TEST"), format="json")
        self.assertEqual(r.status_code, 409)

    def test_mismo_nombre_otro_laboratorio(self):
        self.client.post(URL, self.payload(), format="json")
        r = self.client.post(URL, self.payload(laboratory="Otro laboratorio"), format="json")
        self.assertEqual(r.status_code, 201)

    def test_nombre_de_producto_dado_de_baja(self):
        self.make(name="Vacuna de prueba", laboratory="Laboratorio Test", isDeleted=True)
        self.assertEqual(self.client.post(URL, self.payload(), format="json").status_code, 201)

    def test_sin_autenticacion(self):
        self.client.credentials()
        self.assertEqual(self.client.post(URL, self.payload(), format="json").status_code, 401)

    def test_seed_aplicado(self):
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 19)


class ListVaccineTests(VaccineBase):
    def test_filtro_por_especie_incluye_ambas(self):
        r = self.client.get(URL, {"species": "CAT"})
        names = {v["name"] for v in r.data}
        self.assertIn("Triple Felina", names)
        self.assertIn("Antirrábica", names)  # species vacío = ambas
        self.assertNotIn("Séxtuple", names)  # solo perros

    def test_filtro_por_tipo(self):
        r = self.client.get(URL, {"type": "INTERNAL_ANTIPARASITIC"})
        self.assertTrue(r.data)
        self.assertTrue(all(v["type"] == "INTERNAL_ANTIPARASITIC" for v in r.data))

    def test_busqueda_por_nombre_o_laboratorio(self):
        names = {v["name"] for v in self.client.get(URL, {"search": "nobivac"}).data}
        self.assertIn("Triple Felina", names)
        self.assertIn("Leptospirosis", names)

    def test_filtros_invalidos(self):
        self.assertEqual(self.client.get(URL, {"type": "PIPETA"}).status_code, 400)
        self.assertEqual(self.client.get(URL, {"species": "BIRD"}).status_code, 400)

    def test_detalle_y_detalle_dado_de_baja(self):
        active = self.make()
        removed = self.make(name="Viejo", isDeleted=True)
        self.assertEqual(self.client.get(detail(active.pk)).status_code, 200)
        self.assertEqual(self.client.get(detail(removed.pk)).status_code, 404)


# ---------------------------------------------------------------- TDD-0026 Modificación
class UpdateVaccineTests(VaccineBase):
    def test_cambio_de_laboratorio(self):
        v = self.make()
        r = self.client.patch(detail(v.pk), {"laboratory": "Nuevo lab"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["laboratory"], "Nuevo lab")

    def test_cambio_de_vigencia(self):
        v = self.make()
        self.assertEqual(self.client.patch(detail(v.pk), {"validityDays": 30}, format="json").status_code, 200)

    def test_put_completo(self):
        v = self.make()
        self.assertEqual(self.client.put(detail(v.pk), self.payload(), format="json").status_code, 200)

    def test_mismo_nombre_actual(self):
        v = self.make()
        r = self.client.patch(detail(v.pk), {"name": v.name, "laboratory": v.laboratory}, format="json")
        self.assertEqual(r.status_code, 200)

    def test_inexistente_o_dado_de_baja(self):
        removed = self.make(isDeleted=True)
        self.assertEqual(self.client.patch(detail(99999), {"name": "X"}, format="json").status_code, 404)
        self.assertEqual(self.client.patch(detail(removed.pk), {"name": "X"}, format="json").status_code, 404)

    def test_nombre_vacio(self):
        v = self.make()
        self.assertEqual(self.client.patch(detail(v.pk), {"name": "  "}, format="json").status_code, 400)

    def test_valores_invalidos(self):
        v = self.make()
        for data in ({"type": "X"}, {"species": "X"}, {"validityDays": 0}):
            self.assertEqual(self.client.patch(detail(v.pk), data, format="json").status_code, 400, data)

    def test_colision_con_otro_producto(self):
        self.make(name="Ocupado", laboratory="Lab")
        v = self.make()
        r = self.client.patch(detail(v.pk), {"name": "ocupado", "laboratory": "LAB"}, format="json")
        self.assertEqual(r.status_code, 409)


# ---------------------------------------------------------------- TDD-0027 Baja lógica
class DeleteVaccineTests(VaccineBase):
    def test_baja_correcta(self):
        v = self.make()
        self.assertEqual(self.client.delete(detail(v.pk)).status_code, 204)
        v.refresh_from_db()
        self.assertTrue(v.isDeleted)

    def test_listado_tras_la_baja(self):
        v = self.make(name="Para borrar")
        self.client.delete(detail(v.pk))
        names = [x["name"] for x in self.client.get(URL).data]
        self.assertNotIn("Para borrar", names)

    def test_inexistente_o_ya_eliminado(self):
        removed = self.make(isDeleted=True)
        self.assertEqual(self.client.delete(detail(99999)).status_code, 404)
        self.assertEqual(self.client.delete(detail(removed.pk)).status_code, 404)

    def test_sin_autenticacion(self):
        v = self.make()
        self.client.credentials()
        self.assertEqual(self.client.delete(detail(v.pk)).status_code, 401)
