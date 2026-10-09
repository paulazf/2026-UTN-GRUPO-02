import shutil
import tempfile
from datetime import date, timedelta
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Breed, MedicalTest, MedicalTestFile, Pet

TEMP_MEDIA = tempfile.mkdtemp()
URL = "/api/v1/medical-test/"


def pdf(name="estudio.pdf", size=1024):
    return SimpleUploadedFile(name, b"%PDF-1.4 " + b"0" * size, content_type="application/pdf")


def png(name="foto.png"):
    return SimpleUploadedFile(name, b"\x89PNG\r\n\x1a\n" + b"0" * 100, content_type="image/png")


def first_path(test):
    return Path(test.files.first().file.path)


def detail(pk):
    return f"{URL}{pk}/"


def make_pet(name, isDeleted=False):
    breed, _ = Breed.objects.get_or_create(name="Persa (test)", species="CAT")
    return Pet.objects.create(
        name=name,
        birthDate=date(2023, 3, 15),
        weight="4.20",
        breed=breed,
        idOwner=1,
        isDeleted=isDeleted,
    )


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class MedicalTestBase(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def setUp(self):
        self.luna = make_pet("Luna")
        self.beto = make_pet("Beto")
        self.deleted_pet = make_pet("Michi", isDeleted=True)

    def payload(self, **overrides):
        data = {
            "idPet": self.luna.pk,
            "name": "Hemograma completo",
            "type": "laboratory",
            "date": "2026-08-12",
            "veterinarian": "Dra. Ríos",
            "status": "normal",
            "resultSummary": "Normal",
            "resultDetail": "Todos los parámetros dentro de valores de referencia.",
        }
        data.update(overrides)
        return {k: v for k, v in data.items() if v is not None}

    def make(self, pet=None, **fields):
        defaults = {
            "pet": pet or self.luna,
            "name": "Perfil renal",
            "type": "laboratory",
            "date": date(2026, 8, 12),
            "status": "normal",
            "resultSummary": "Normal",
        }
        defaults.update(fields)
        return MedicalTest.objects.create(**defaults)

    def post(self, data):
        return self.client.post(URL, data, format="multipart")


# ---------------------------------------------------------------- TDD-0010 Alta
class CreateMedicalTestTests(MedicalTestBase):
    def test_alta_completa_con_pdf(self):
        r = self.post(self.payload(newFiles=[pdf()]))
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        obj = MedicalTest.objects.get(pk=r.data["idMedicalTest"])
        self.assertFalse(obj.isDeleted)
        self.assertTrue(first_path(obj).exists())
        self.assertEqual(r.data["petName"], "Luna")
        self.assertEqual(len(r.data["files"]), 1)
        self.assertEqual(r.data["files"][0]["name"], "estudio.pdf")
        self.assertTrue(r.data["files"][0]["url"].startswith("http://"))

    def test_alta_con_varios_archivos(self):
        files = [pdf("informe.pdf"), png("placa1.png"), png("placa2.png")]
        r = self.post(self.payload(newFiles=files))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual([f["name"] for f in r.data["files"]], ["informe.pdf", "placa1.png", "placa2.png"])

    @override_settings(MEDICAL_TEST_MAX_FILES=2)
    def test_demasiados_archivos(self):
        r = self.post(self.payload(newFiles=[pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf")]))
        self.assertEqual(r.status_code, 400)
        self.assertIn("newFiles", r.data)
        self.assertEqual(MedicalTest.objects.count(), 0)

    def test_un_archivo_invalido_rechaza_todo(self):
        bad = SimpleUploadedFile("x.zip", b"PK", content_type="application/zip")
        r = self.post(self.payload(newFiles=[pdf(), bad]))
        self.assertEqual(r.status_code, 400)
        self.assertEqual(MedicalTest.objects.count(), 0)
        self.assertEqual(MedicalTestFile.objects.count(), 0)

    def test_alta_con_imagen(self):
        r = self.post(self.payload(newFiles=[png()]))
        self.assertEqual(r.status_code, 201, r.data)

    def test_alta_sin_archivo(self):
        r = self.post(self.payload())
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["files"], [])

    def test_alta_pendiente_sin_resultado_ni_archivo(self):
        r = self.post(self.payload(status="pending", resultSummary=None, resultDetail=None))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["resultSummary"], "")

    def test_alta_sin_veterinario(self):
        r = self.post(self.payload(veterinarian=None))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["veterinarian"], "")

    def test_nombre_faltante_o_solo_espacios(self):
        self.assertEqual(self.post(self.payload(name=None)).status_code, 400)
        self.assertEqual(self.post(self.payload(name="   ")).status_code, 400)

    def test_nombre_demasiado_largo(self):
        self.assertEqual(self.post(self.payload(name="a" * 101)).status_code, 400)

    def test_tipo_faltante_o_invalido(self):
        self.assertEqual(self.post(self.payload(type=None)).status_code, 400)
        self.assertEqual(self.post(self.payload(type="ecografia")).status_code, 400)

    def test_estado_faltante_o_invalido(self):
        self.assertEqual(self.post(self.payload(status=None)).status_code, 400)
        self.assertEqual(self.post(self.payload(status="ok")).status_code, 400)

    def test_fecha_faltante_o_mal_formada(self):
        self.assertEqual(self.post(self.payload(date=None)).status_code, 400)
        self.assertEqual(self.post(self.payload(date="32/13/2026")).status_code, 400)

    def test_fecha_futura(self):
        mañana = (date.today() + timedelta(days=1)).isoformat()
        self.assertEqual(self.post(self.payload(date=mañana)).status_code, 400)

    def test_resultado_faltante_con_estado_alterado(self):
        r = self.post(self.payload(status="altered", resultSummary=None))
        self.assertEqual(r.status_code, 400)
        self.assertIn("resultSummary", r.data)

    def test_formato_no_permitido(self):
        docx = SimpleUploadedFile(
            "informe.docx",
            b"PK...",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        r = self.post(self.payload(newFiles=[docx]))
        self.assertEqual(r.status_code, 400)
        self.assertIn("newFiles", r.data)

    def test_extension_falsa(self):
        fake = SimpleUploadedFile("virus.exe", b"MZ...", content_type="application/pdf")
        self.assertEqual(self.post(self.payload(newFiles=[fake])).status_code, 400)

    @override_settings(MEDICAL_TEST_MAX_SIZE=1024)
    def test_archivo_demasiado_grande(self):
        r = self.post(self.payload(newFiles=[pdf(size=2048)]))
        self.assertEqual(r.status_code, 400)

    def test_archivo_vacio(self):
        empty = SimpleUploadedFile("vacio.pdf", b"", content_type="application/pdf")
        self.assertEqual(self.post(self.payload(newFiles=[empty])).status_code, 400)

    def test_mascota_inexistente(self):
        self.assertEqual(self.post(self.payload(idPet=9999)).status_code, 404)

    def test_mascota_dada_de_baja(self):
        self.assertEqual(self.post(self.payload(idPet=self.deleted_pet.pk)).status_code, 404)

    def test_mascota_faltante(self):
        self.assertEqual(self.post(self.payload(idPet=None)).status_code, 400)

    def test_nombre_repetido_en_la_misma_mascota(self):
        self.assertEqual(self.post(self.payload()).status_code, 201)
        self.assertEqual(self.post(self.payload()).status_code, 201)

    def test_alta_json_sin_archivo(self):
        r = self.client.post(URL, self.payload(), format="json")
        self.assertEqual(r.status_code, 201, r.data)


# ------------------------------------------------------------ TDD-0011 Consulta
class ListMedicalTestTests(MedicalTestBase):
    def setUp(self):
        super().setUp()
        self.old = self.make(name="Viejo", date=date(2026, 1, 1))
        self.new = self.make(name="Nuevo", date=date(2026, 9, 1))
        self.pending = self.make(
            name="Análisis de orina", date=date(2026, 9, 10), status="pending", resultSummary=""
        )
        self.removed = self.make(name="Borrado", isDeleted=True)
        self.beto_test = self.make(pet=self.beto, name="Radiografía de cadera")
        self.hidden = self.make(pet=self.deleted_pet, name="De mascota borrada")

    def test_listado_por_mascota_ordenado(self):
        r = self.client.get(URL, {"idPet": self.luna.pk})
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["name"] for x in r.data], ["Análisis de orina", "Nuevo", "Viejo"])

    def test_mascota_sin_estudios(self):
        empty = make_pet("Nuevo")
        r = self.client.get(URL, {"idPet": empty.pk})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, [])

    def test_excluye_eliminados(self):
        r = self.client.get(URL, {"idPet": self.luna.pk})
        self.assertNotIn("Borrado", [x["name"] for x in r.data])

    def test_historial_general(self):
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 200)
        names = {x["name"] for x in r.data}
        self.assertIn("Radiografía de cadera", names)
        self.assertIn("Nuevo", names)
        self.assertNotIn("De mascota borrada", names)
        self.assertEqual(len(r.data), 4)
        self.assertTrue(all("petName" in x for x in r.data))

    def test_filtro_pendientes(self):
        r = self.client.get(URL, {"idPet": self.luna.pk, "status": "pending"})
        self.assertEqual([x["name"] for x in r.data], ["Análisis de orina"])

    def test_detalle(self):
        r = self.client.get(detail(self.new.pk))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["name"], "Nuevo")
        self.assertEqual(r.data["files"], [])

    def test_idpet_inexistente_o_dado_de_baja(self):
        self.assertEqual(self.client.get(URL, {"idPet": 9999}).status_code, 404)
        self.assertEqual(self.client.get(URL, {"idPet": self.deleted_pet.pk}).status_code, 404)

    def test_detalle_inexistente_o_eliminado(self):
        self.assertEqual(self.client.get(detail(9999)).status_code, 404)
        self.assertEqual(self.client.get(detail(self.removed.pk)).status_code, 404)
        self.assertEqual(self.client.get(detail(self.hidden.pk)).status_code, 404)

    def test_parametros_invalidos(self):
        self.assertEqual(self.client.get(URL, {"idPet": "abc"}).status_code, 400)
        self.assertEqual(self.client.get(URL, {"status": "ok"}).status_code, 400)


# -------------------------------------------------------- TDD-0012 Modificación
class UpdateMedicalTestTests(MedicalTestBase):
    def patch(self, pk, data, fmt="multipart"):
        return self.client.patch(detail(pk), data, format=fmt)

    def test_completar_pendiente(self):
        test = self.make(status="pending", resultSummary="")
        r = self.patch(
            test.pk, {"status": "normal", "resultSummary": "Sin alteraciones", "newFiles": [pdf()]}
        )
        self.assertEqual(r.status_code, 200, r.data)
        test.refresh_from_db()
        self.assertEqual(test.status, "normal")
        self.assertEqual(test.files.count(), 1)

    def test_completar_pendiente_sin_resultado(self):
        test = self.make(status="pending", resultSummary="")
        self.assertEqual(self.patch(test.pk, {"status": "altered"}).status_code, 400)

    def test_volver_a_pendiente(self):
        test = self.make()
        self.assertEqual(self.patch(test.pk, {"status": "pending"}).status_code, 200)

    def test_cambio_de_nombre_json(self):
        test = self.make()
        r = self.patch(test.pk, {"name": "Perfil renal (control)"}, fmt="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["name"], "Perfil renal (control)")
        self.assertEqual(r.data["type"], "laboratory")

    def test_cambio_de_tipo_o_fecha(self):
        test = self.make()
        r = self.patch(test.pk, {"type": "imaging", "date": "2026-01-15"})
        self.assertEqual(r.status_code, 200)

    def test_mismo_nombre_actual(self):
        test = self.make()
        self.assertEqual(self.patch(test.pk, {"name": test.name}).status_code, 200)

    def test_agregar_archivos_conserva_los_anteriores(self):
        r = self.post(self.payload(newFiles=[pdf("informe.pdf")]))
        test = MedicalTest.objects.get(pk=r.data["idMedicalTest"])
        r = self.patch(test.pk, {"newFiles": [png("placa1.png"), png("placa2.png")]})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual([f["name"] for f in r.data["files"]], ["informe.pdf", "placa1.png", "placa2.png"])

    def test_quitar_archivo_lo_borra_del_disco(self):
        r = self.post(self.payload(newFiles=[pdf("viejo.pdf"), png("placa.png")]))
        test = MedicalTest.objects.get(pk=r.data["idMedicalTest"])
        old = test.files.get(name="viejo.pdf")
        old_path = Path(old.file.path)
        self.assertTrue(old_path.exists())

        with self.captureOnCommitCallbacks(execute=True):
            r = self.patch(test.pk, {"removedFiles": [old.pk], "newFiles": [pdf("nuevo.pdf")]})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual([f["name"] for f in r.data["files"]], ["placa.png", "nuevo.pdf"])
        self.assertFalse(old_path.exists())

    def test_quitar_archivo_de_otro_estudio(self):
        r = self.post(self.payload(newFiles=[pdf()]))
        other_file = MedicalTestFile.objects.get(medicalTest_id=r.data["idMedicalTest"])
        test = self.make()
        r = self.patch(test.pk, {"removedFiles": [other_file.pk]})
        self.assertEqual(r.status_code, 400)
        self.assertTrue(MedicalTestFile.objects.filter(pk=other_file.pk).exists())

    @override_settings(MEDICAL_TEST_MAX_FILES=2)
    def test_superar_el_maximo_al_editar(self):
        r = self.post(self.payload(newFiles=[pdf("a.pdf"), pdf("b.pdf")]))
        test_id = r.data["idMedicalTest"]
        self.assertEqual(self.patch(test_id, {"newFiles": [pdf("c.pdf")]}).status_code, 400)
        # Quitando uno, el nuevo entra.
        first = MedicalTestFile.objects.filter(medicalTest_id=test_id).first()
        r = self.patch(test_id, {"removedFiles": [first.pk], "newFiles": [pdf("c.pdf")]})
        self.assertEqual(r.status_code, 200, r.data)

    def test_archivo_invalido_conserva_los_anteriores(self):
        r = self.post(self.payload(newFiles=[pdf("bueno.pdf")]))
        test = MedicalTest.objects.get(pk=r.data["idMedicalTest"])
        old = test.files.get()
        old_path = Path(old.file.path)
        bad = SimpleUploadedFile("x.zip", b"PK", content_type="application/zip")
        with self.captureOnCommitCallbacks(execute=True):
            r = self.patch(test.pk, {"removedFiles": [old.pk], "newFiles": [bad]})
        self.assertEqual(r.status_code, 400)
        self.assertTrue(old_path.exists())
        self.assertTrue(MedicalTestFile.objects.filter(pk=old.pk).exists())

    def test_id_inexistente_eliminado_o_de_mascota_borrada(self):
        removed = self.make(isDeleted=True)
        hidden = self.make(pet=self.deleted_pet)
        for pk in (9999, removed.pk, hidden.pk):
            self.assertEqual(self.patch(pk, {"name": "X"}).status_code, 404)

    def test_nombre_vacio(self):
        test = self.make()
        self.assertEqual(self.patch(test.pk, {"name": "  "}).status_code, 400)

    def test_valores_invalidos(self):
        test = self.make()
        mañana = (date.today() + timedelta(days=1)).isoformat()
        for data in ({"type": "x"}, {"status": "x"}, {"date": "x"}, {"date": mañana}):
            self.assertEqual(self.patch(test.pk, data).status_code, 400, data)

    def test_borrar_resultado_con_estado_normal(self):
        test = self.make()
        self.assertEqual(self.patch(test.pk, {"resultSummary": ""}).status_code, 400)

    def test_intento_de_cambiar_mascota(self):
        test = self.make()
        r = self.patch(test.pk, {"idPet": self.beto.pk})
        self.assertEqual(r.status_code, 400)
        test.refresh_from_db()
        self.assertEqual(test.pet_id, self.luna.pk)

    def test_put_no_permitido(self):
        test = self.make()
        r = self.client.put(detail(test.pk), self.payload(), format="multipart")
        self.assertEqual(r.status_code, 405)


# ---------------------------------------------------------- TDD-0013 Baja lógica
class DeleteMedicalTestTests(MedicalTestBase):
    def test_baja_correcta_conserva_registro_y_archivo(self):
        r = self.post(self.payload(newFiles=[pdf()]))
        test = MedicalTest.objects.get(pk=r.data["idMedicalTest"])
        r = self.client.delete(detail(test.pk))
        self.assertEqual(r.status_code, 204)
        test.refresh_from_db()
        self.assertTrue(test.isDeleted)
        self.assertTrue(first_path(test).exists())

    def test_baja_de_pendiente(self):
        test = self.make(status="pending", resultSummary="")
        self.assertEqual(self.client.delete(detail(test.pk)).status_code, 204)
        r = self.client.get(URL, {"idPet": self.luna.pk, "status": "pending"})
        self.assertEqual(r.data, [])

    def test_id_inexistente_o_ya_eliminado(self):
        removed = self.make(isDeleted=True)
        self.assertEqual(self.client.delete(detail(9999)).status_code, 404)
        self.assertEqual(self.client.delete(detail(removed.pk)).status_code, 404)

    def test_listado_y_detalle_tras_la_baja(self):
        test = self.make()
        other = self.make(name="Otro")
        self.client.delete(detail(test.pk))
        names = [x["name"] for x in self.client.get(URL, {"idPet": self.luna.pk}).data]
        self.assertEqual(names, ["Otro"])
        self.assertNotIn(test.pk, [x["idMedicalTest"] for x in self.client.get(URL).data])
        self.assertEqual(self.client.get(detail(test.pk)).status_code, 404)
        self.assertEqual(self.client.patch(detail(test.pk), {"name": "X"}).status_code, 404)
        self.assertEqual(self.client.get(detail(other.pk)).status_code, 200)
