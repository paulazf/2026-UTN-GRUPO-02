"""Tests de Appointment, Address, City y Province (TDD-0032 a TDD-0037)."""

from datetime import date, time, timedelta
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Breed, Owner, Pet, Province, City, Address, Appointment

URL_APPOINTMENTS = "/api/v1/appointments/"
URL_ADDRESSES = "/api/v1/addresses/"
URL_PROVINCES = "/api/v1/provinces/"
URL_CITIES = "/api/v1/cities/"


def make_user(email):
    user = User.objects.create_user(username=email, email=email, password="pwd")
    owner = Owner.objects.create(user=user, email=email, firstName="Test", lastName="User")
    token, _ = Token.objects.get_or_create(user=user)
    return owner, token


def make_pet(name, owner, species="CAT", isDeleted=False):
    breed, _ = Breed.objects.get_or_create(name=f"Raza test {species}", species=species)
    return Pet.objects.create(
        name=name, birthDate=date(2023, 3, 15), weight="4.20",
        breed=breed, idOwner=owner.idOwner, isDeleted=isDeleted,
    )


class AppointmentBaseTestCase(APITestCase):
    def setUp(self):
        self.owner, token = make_user("duenio_app@email.com")
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        self.other_owner, self.other_token = make_user("otro_app@email.com")

        self.luna = make_pet("Luna", self.owner, "CAT")
        self.foreign_pet = make_pet("Ajeno", self.other_owner, "CAT")

        # Geo
        self.prov_caba = Province.objects.get(name="Ciudad Autónoma de Buenos Aires")
        self.prov_cba = Province.objects.get(name="Córdoba")
        self.city_palermo = City.objects.get(name="Palermo", province=self.prov_caba)
        self.city_cba = City.objects.get(name="Córdoba", province=self.prov_cba)

        # Address preexistente
        self.address = Address.objects.create(
            owner=self.owner,
            city=self.city_palermo,
            referenceName="Clínica Palermo",
            street="Av. Santa Fe",
            number="3200",
            floor=1,
            apartment="A",
        )
        self.foreign_address = Address.objects.create(
            owner=self.other_owner,
            city=self.city_cba,
            referenceName="Clínica Ajena",
            street="Colón",
            number="500",
        )


# ---------------------------------------------------------------- TDD-0032: Geo Catalog
class GeoCatalogTests(AppointmentBaseTestCase):
    def test_list_provinces(self):
        r = self.client.get(URL_PROVINCES)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 24)
        names = [p["name"] for p in r.data]
        self.assertIn("Ciudad Autónoma de Buenos Aires", names)
        self.assertIn("Córdoba", names)

    def test_list_cities_requires_province(self):
        r = self.client.get(URL_CITIES)
        self.assertEqual(r.status_code, 400)
        self.assertIn("idProvince", r.data)

    def test_list_cities_by_province(self):
        r = self.client.get(f"{URL_CITIES}?idProvince={self.prov_caba.pk}")
        self.assertEqual(r.status_code, 200)
        self.assertGreater(len(r.data), 0)
        self.assertTrue(all(c["idProvince"] == self.prov_caba.pk for c in r.data))

    def test_search_cities_by_term(self):
        r = self.client.get(f"{URL_CITIES}?idProvince={self.prov_caba.pk}&search=pale")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["name"], "Palermo")

    def test_list_cities_province_not_found(self):
        r = self.client.get(f"{URL_CITIES}?idProvince=99999")
        self.assertEqual(r.status_code, 404)


# ---------------------------------------------------------------- TDD-0033: Addresses
class AddressTests(AppointmentBaseTestCase):
    def test_create_address_success(self):
        payload = {
            "referenceName": "Veterinaria San Roque",
            "street": "Corrientes",
            "number": "1500",
            "idCity": self.city_palermo.pk,
        }
        r = self.client.post(URL_ADDRESSES, payload, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["referenceName"], "Veterinaria San Roque")
        self.assertEqual(r.data["cityName"], "Palermo")

    def test_list_user_addresses_only(self):
        r = self.client.get(URL_ADDRESSES)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["referenceName"], "Clínica Palermo")


# ---------------------------------------------------------------- TDD-0034: Alta de Turno
class CreateAppointmentTests(AppointmentBaseTestCase):
    def test_create_appointment_with_existing_address(self):
        payload = {
            "idPet": self.luna.pk,
            "idAddress": self.address.pk,
            "date": "2026-11-10",
            "time": "15:30:00",
            "veterinarian": "Dra. García",
            "description": "Control anual de vacunas",
        }
        r = self.client.post(URL_APPOINTMENTS, payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["petName"], "Luna")
        self.assertEqual(r.data["veterinarian"], "Dra. García")
        self.assertEqual(r.data["address"]["referenceName"], "Clínica Palermo")

    def test_create_appointment_with_new_address_in_hot(self):
        payload = {
            "idPet": self.luna.pk,
            "newAddress": {
                "referenceName": "Hospital 24hs",
                "street": "Av. Córdoba",
                "number": "4500",
                "idCity": self.city_palermo.pk,
            },
            "date": "2026-11-12",
            "time": "10:00:00",
            "veterinarian": "Dr. Pérez",
            "description": "Ecografía de control",
        }
        r = self.client.post(URL_APPOINTMENTS, payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIsNotNone(r.data["idAddress"])
        self.assertEqual(r.data["address"]["referenceName"], "Hospital 24hs")

        # Verificar que el domicilio quedó guardado para el usuario
        self.assertTrue(Address.objects.filter(referenceName="Hospital 24hs", owner=self.owner).exists())

    def test_create_appointment_without_address(self):
        payload = {
            "idPet": self.luna.pk,
            "idAddress": None,
            "date": "2026-11-15",
            "time": "11:00:00",
            "veterinarian": "Dr. Online",
            "description": "Teleconsulta",
        }
        r = self.client.post(URL_APPOINTMENTS, payload, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(r.data["idAddress"])
        self.assertIsNone(r.data["address"])

    def test_collision_same_pet_date_time_conflict(self):
        payload = {
            "idPet": self.luna.pk,
            "date": "2026-11-20",
            "time": "16:00:00",
            "veterinarian": "Dr. Uno",
        }
        r1 = self.client.post(URL_APPOINTMENTS, payload, format="json")
        self.assertEqual(r1.status_code, 201)

        # Mismo turno para la misma mascota en el mismo día y horario
        payload2 = {
            "idPet": self.luna.pk,
            "date": "2026-11-20",
            "time": "16:00:00",
            "veterinarian": "Dr. Dos",
        }
        r2 = self.client.post(URL_APPOINTMENTS, payload2, format="json")
        self.assertEqual(r2.status_code, 409)

    def test_foreign_pet_not_found(self):
        payload = {
            "idPet": self.foreign_pet.pk,
            "date": "2026-11-20",
            "time": "16:00:00",
            "veterinarian": "Dr. X",
        }
        r = self.client.post(URL_APPOINTMENTS, payload, format="json")
        self.assertEqual(r.status_code, 404)

    def test_foreign_address_bad_request(self):
        payload = {
            "idPet": self.luna.pk,
            "idAddress": self.foreign_address.pk,
            "date": "2026-11-20",
            "time": "16:00:00",
            "veterinarian": "Dr. X",
        }
        r = self.client.post(URL_APPOINTMENTS, payload, format="json")
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------- TDD-0035: Consulta de Turnos
class GetAppointmentTests(AppointmentBaseTestCase):
    def test_list_by_pet(self):
        Appointment.objects.create(
            pet=self.luna,
            address=self.address,
            date=date(2026, 11, 10),
            time=time(10, 0),
            veterinarian="Dr. Test",
        )
        r = self.client.get(f"{URL_APPOINTMENTS}?idPet={self.luna.pk}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["petName"], "Luna")

    def test_list_foreign_pet_not_found(self):
        r = self.client.get(f"{URL_APPOINTMENTS}?idPet={self.foreign_pet.pk}")
        self.assertEqual(r.status_code, 404)

    def test_retrieve_appointment(self):
        app = Appointment.objects.create(
            pet=self.luna,
            address=self.address,
            date=date(2026, 11, 10),
            time=time(10, 0),
            veterinarian="Dr. Test",
        )
        r = self.client.get(f"{URL_APPOINTMENTS}{app.pk}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["veterinarian"], "Dr. Test")


# ---------------------------------------------------------------- TDD-0036: Modificación de Turnos
class UpdateAppointmentTests(AppointmentBaseTestCase):
    def test_update_appointment_time(self):
        app = Appointment.objects.create(
            pet=self.luna,
            address=self.address,
            date=date(2026, 11, 10),
            time=time(10, 0),
            veterinarian="Dr. Test",
        )
        r = self.client.patch(f"{URL_APPOINTMENTS}{app.pk}/", {"time": "11:30:00"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["time"], "11:30:00")

    def test_cannot_change_pet(self):
        app = Appointment.objects.create(
            pet=self.luna,
            address=self.address,
            date=date(2026, 11, 10),
            time=time(10, 0),
            veterinarian="Dr. Test",
        )
        r = self.client.patch(f"{URL_APPOINTMENTS}{app.pk}/", {"idPet": 99999}, format="json")
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------- TDD-0037: Baja Lógica de Turnos
class DeleteAppointmentTests(AppointmentBaseTestCase):
    def test_soft_delete_appointment(self):
        app = Appointment.objects.create(
            pet=self.luna,
            address=self.address,
            date=date(2026, 11, 10),
            time=time(10, 0),
            veterinarian="Dr. Test",
        )
        r = self.client.delete(f"{URL_APPOINTMENTS}{app.pk}/")
        self.assertEqual(r.status_code, 204)

        app.refresh_from_db()
        self.assertTrue(app.isDeleted)

