"""Tests de Owner y Autenticación (TDD-0042)."""

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Owner

URL_REGISTER = "/api/v1/owner/"
URL_PROFILE = "/api/v1/owner/me/"
URL_PASSWORD = "/api/v1/owner/me/password/"
URL_LOGIN = "/api/v1/auth/login/"
URL_LOGOUT = "/api/v1/auth/logout/"


class OwnerBaseTestCase(APITestCase):
    def create_authenticated_owner(self, email="valentina@email.com", password="PasswordSegura2026!"):
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name="Valentina",
            last_name="García"
        )
        owner = Owner.objects.create(
            user=user,
            email=email,
            firstName="Valentina",
            lastName="García",
            phone="2215550123"
        )
        token, _ = Token.objects.get_or_create(user=user)
        return user, owner, token

    def authenticate_user(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        return token


# ---------------------------------------------------------------- Registro (TDD-0042)
class RegisterOwnerTests(OwnerBaseTestCase):
    def payload(self, **overrides):
        data = {
            "firstName": "Valentina",
            "lastName": "García",
            "email": "valentina@email.com",
            "password": "PasswordSegura2026!",
        }
        data.update(overrides)
        return data

    def test_registro_correcto(self):
        r = self.client.post(URL_REGISTER, self.payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertIn("token", r.data)
        self.assertEqual(r.data["owner"]["firstName"], "Valentina")
        self.assertEqual(r.data["owner"]["lastName"], "García")
        self.assertEqual(r.data["owner"]["email"], "valentina@email.com")

        # Sincronización en auth_user
        user = User.objects.get(email="valentina@email.com")
        self.assertEqual(user.first_name, "Valentina")
        self.assertEqual(user.last_name, "García")

    def test_registro_con_espacios_en_nombres(self):
        r = self.client.post(
            URL_REGISTER,
            self.payload(firstName="  Valentina  ", lastName="  García  "),
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(r.data["owner"]["firstName"], "Valentina")
        self.assertEqual(r.data["owner"]["lastName"], "García")

        user = User.objects.get(email="valentina@email.com")
        self.assertEqual(user.first_name, "Valentina")
        self.assertEqual(user.last_name, "García")

    def test_registro_email_normalizado(self):
        r = self.client.post(
            URL_REGISTER,
            self.payload(email="  Valentina@Email.COM  "),
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(r.data["owner"]["email"], "valentina@email.com")

    def test_registro_nombre_o_apellido_vacio(self):
        r = self.client.post(URL_REGISTER, self.payload(firstName=""), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("firstName", r.data)

        r = self.client.post(URL_REGISTER, self.payload(lastName=""), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lastName", r.data)

    def test_registro_nombre_o_apellido_solo_espacios(self):
        r = self.client.post(URL_REGISTER, self.payload(firstName="   "), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("firstName", r.data)

        r = self.client.post(URL_REGISTER, self.payload(lastName="   "), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lastName", r.data)

    def test_registro_nombre_demasiado_largo(self):
        r = self.client.post(URL_REGISTER, self.payload(firstName="A" * 151), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("firstName", r.data)

    def test_registro_email_invalido(self):
        r = self.client.post(URL_REGISTER, self.payload(email="valentina@"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", r.data)

    def test_registro_contrasena_corta(self):
        r = self.client.post(URL_REGISTER, self.payload(password="1234567"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", r.data)

    def test_registro_contrasena_comun(self):
        r = self.client.post(URL_REGISTER, self.payload(password="password123"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", r.data)

    def test_registro_contrasena_solo_numerica(self):
        r = self.client.post(URL_REGISTER, self.payload(password="12345678"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", r.data)

    def test_registro_email_duplicado(self):
        self.client.post(URL_REGISTER, self.payload(), format="json")
        r = self.client.post(URL_REGISTER, self.payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", r.data)


# ---------------------------------------------------------------- Login (TDD-0042)
class LoginOwnerTests(OwnerBaseTestCase):
    def setUp(self):
        super().setUp()
        self.user, self.owner, self.token = self.create_authenticated_owner(
            email="valentina@email.com",
            password="PasswordSegura2026!"
        )

    def test_login_correcto(self):
        r = self.client.post(
            URL_LOGIN,
            {"email": "valentina@email.com", "password": "PasswordSegura2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("token", r.data)
        self.assertEqual(r.data["owner"]["email"], "valentina@email.com")

    def test_login_email_otra_capitalizacion(self):
        r = self.client.post(
            URL_LOGIN,
            {"email": "VALENTINA@EMAIL.COM", "password": "PasswordSegura2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_login_email_con_espacios_en_extremos(self):
        r = self.client.post(
            URL_LOGIN,
            {"email": "  valentina@email.com  ", "password": "PasswordSegura2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_login_contrasena_incorrecta(self):
        r = self.client.post(
            URL_LOGIN,
            {"email": "valentina@email.com", "password": "ClaveIncorrecta!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("detail", r.data)
        self.assertNotIn("error", r.data)

    def test_login_email_inexistente(self):
        r = self.client.post(
            URL_LOGIN,
            {"email": "noexiste@email.com", "password": "PasswordSegura2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("detail", r.data)

    def test_login_falta_campos(self):
        r = self.client.post(URL_LOGIN, {"email": "v@email.com"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", r.data)

    def test_login_cuenta_dada_de_baja(self):
        self.user.is_active = False
        self.user.save()
        self.owner.isDeleted = True
        self.owner.save()

        r = self.client.post(
            URL_LOGIN,
            {"email": "valentina@email.com", "password": "PasswordSegura2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------- Logout (TDD-0042)
class LogoutOwnerTests(OwnerBaseTestCase):
    def setUp(self):
        super().setUp()
        self.user, self.owner, self.token = self.create_authenticated_owner()
        self.authenticate_user(self.user)

    def test_logout_correcto(self):
        r = self.client.post(URL_LOGOUT)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["detail"], "Sesión cerrada exitosamente.")
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_logout_sin_sesion(self):
        self.client.credentials()  # Sin token
        r = self.client.post(URL_LOGOUT)
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------- Perfil (TDD-0042)
class ProfileOwnerTests(OwnerBaseTestCase):
    def setUp(self):
        super().setUp()
        self.user, self.owner, self.token = self.create_authenticated_owner()
        self.authenticate_user(self.user)

    def test_consulta_perfil_propio(self):
        r = self.client.get(URL_PROFILE)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["email"], "valentina@email.com")
        self.assertEqual(r.data["firstName"], "Valentina")

    def test_edicion_parcial(self):
        r = self.client.patch(URL_PROFILE, {"firstName": "Valen"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["firstName"], "Valen")
        self.assertEqual(r.data["lastName"], "García")

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Valen")

    def test_telefono_con_espacios_o_vacio(self):
        r = self.client.patch(URL_PROFILE, {"phone": "   "}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsNone(r.data["phone"])

        self.owner.refresh_from_db()
        self.assertIsNone(self.owner.phone)

    def test_edicion_nombre_vacio_o_solo_espacios(self):
        r = self.client.patch(URL_PROFILE, {"firstName": "   "}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("firstName", r.data)

    def test_perfil_sin_sesion(self):
        self.client.credentials()
        r = self.client.get(URL_PROFILE)
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_sin_perfil_de_owner(self):
        admin = User.objects.create_superuser(username="admin@test.com", email="admin@test.com", password="pwd")
        token = Token.objects.create(user=admin)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)

        r = self.client.get(URL_PROFILE)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.data["detail"], "Perfil no encontrado.")
        self.assertNotIn("error", r.data)


# ---------------------------------------------------------------- Cambio de Contraseña (TDD-0042)
class ChangePasswordOwnerTests(OwnerBaseTestCase):
    def setUp(self):
        super().setUp()
        self.user, self.owner, self.token = self.create_authenticated_owner(
            password="PasswordActual2026!"
        )
        self.authenticate_user(self.user)

    def test_cambio_correcto(self):
        r = self.client.post(
            URL_PASSWORD,
            {"currentPassword": "PasswordActual2026!", "newPassword": "NuevaPassword2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("token", r.data)

        # Login con la clave nueva funciona (limpiando credenciales previas del cliente)
        self.client.credentials()
        r_login = self.client.post(
            URL_LOGIN,
            {"email": "valentina@email.com", "password": "NuevaPassword2026!"},
            format="json"
        )
        self.assertEqual(r_login.status_code, status.HTTP_200_OK)

        # Login con la clave anterior falla
        r_old = self.client.post(
            URL_LOGIN,
            {"email": "valentina@email.com", "password": "PasswordActual2026!"},
            format="json"
        )
        self.assertEqual(r_old.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cambio_clave_actual_incorrecta(self):
        r = self.client.post(
            URL_PASSWORD,
            {"currentPassword": "ClaveErronea123!", "newPassword": "NuevaPassword2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("currentPassword", r.data)

    def test_cambio_clave_nueva_igual_a_actual(self):
        r = self.client.post(
            URL_PASSWORD,
            {"currentPassword": "PasswordActual2026!", "newPassword": "PasswordActual2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("newPassword", r.data)

    def test_cambio_clave_nueva_debil(self):
        r = self.client.post(
            URL_PASSWORD,
            {"currentPassword": "PasswordActual2026!", "newPassword": "123"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("newPassword", r.data)


# ---------------------------------------------------------------- Baja Lógica (TDD-0042)
class DeleteOwnerTests(OwnerBaseTestCase):
    def setUp(self):
        super().setUp()
        self.user, self.owner, self.token = self.create_authenticated_owner(
            email="baja@email.com",
            password="PasswordSegura2026!"
        )
        self.authenticate_user(self.user)

    def test_baja_correcta(self):
        r = self.client.delete(URL_PROFILE)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

        self.owner.refresh_from_db()
        self.assertTrue(self.owner.isDeleted)
        self.assertTrue(self.owner.email.startswith("deleted_"))

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_login_tras_la_baja_falla(self):
        self.client.delete(URL_PROFILE)
        self.client.credentials()
        r = self.client.post(
            URL_LOGIN,
            {"email": "baja@email.com", "password": "PasswordSegura2026!"},
            format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reutilizar_email_tras_la_baja(self):
        # Baja de la cuenta existente
        self.client.delete(URL_PROFILE)
        self.client.credentials()

        # Registro de una cuenta nueva con el mismo email original
        r_new = self.client.post(
            URL_REGISTER,
            {
                "firstName": "Nuevo",
                "lastName": "Tutor",
                "email": "baja@email.com",
                "password": "PasswordSegura2026!",
            },
            format="json"
        )
        self.assertEqual(r_new.status_code, status.HTTP_201_CREATED, r_new.data)
        self.assertEqual(r_new.data["owner"]["email"], "baja@email.com")
