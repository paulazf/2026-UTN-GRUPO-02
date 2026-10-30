"""Pruebas automatizadas para autenticación con Google (TDD-0044)."""

from unittest.mock import patch
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APITestCase

from .models import Owner

URL_GOOGLE_AUTH = "/api/v1/auth/google/"


class GoogleAuthTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.mock_google_user = {
            "sub": "google-user-id-12345",
            "email": "martina.google@gmail.com",
            "email_verified": True,
            "given_name": "Martina",
            "family_name": "Lopez",
            "name": "Martina Lopez",
            "picture": "https://lh3.googleusercontent.com/photo.jpg",
            "aud": "valid-web-client-id.apps.googleusercontent.com",
        }

    def test_google_auth_sin_token(self):
        """Petición sin idToken debe fallar con 400 Bad Request."""
        r = self.client.post(URL_GOOGLE_AUTH, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", r.data)
        self.assertEqual(
            r.data["detail"],
            "Debe proporcionar el token de autenticación de Google (idToken)."
        )

    def test_google_auth_token_vacio(self):
        """Petición con idToken vacío debe fallar con 400 Bad Request."""
        r = self.client.post(URL_GOOGLE_AUTH, {"idToken": "   "}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", r.data)

    @patch("api.views.auth.verify_google_id_token")
    def test_google_auth_token_invalido(self, mock_verify):
        """Si el token es inválido o expiró, debe responder 401 Unauthorized."""
        mock_verify.side_effect = AuthenticationFailed("El token de Google es inválido o ha expirado.")

        r = self.client.post(URL_GOOGLE_AUTH, {"idToken": "token-falso"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(r.data["detail"], "El token de Google es inválido o ha expirado.")

    @patch("api.views.auth.verify_google_id_token")
    def test_google_auth_registro_nuevo_usuario(self, mock_verify):
        """Usuario nuevo se registra automáticamente en un solo toque (200 OK y isNewUser=True)."""
        mock_verify.return_value = self.mock_google_user

        r = self.client.post(URL_GOOGLE_AUTH, {"idToken": "valid-id-token"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertIn("token", r.data)
        self.assertTrue(r.data["isNewUser"])
        self.assertEqual(r.data["owner"]["email"], "martina.google@gmail.com")
        self.assertEqual(r.data["owner"]["firstName"], "Martina")
        self.assertEqual(r.data["owner"]["lastName"], "Lopez")

        # Verificar persistencia en base de datos
        user = User.objects.get(username="martina.google@gmail.com")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.first_name, "Martina")
        self.assertEqual(user.last_name, "Lopez")

        owner = Owner.objects.get(user=user)
        self.assertEqual(owner.email, "martina.google@gmail.com")
        self.assertFalse(owner.isDeleted)

        # Token DRF generado correctamente
        self.assertTrue(Token.objects.filter(user=user, key=r.data["token"]).exists())

    @patch("api.views.auth.verify_google_id_token")
    def test_google_auth_login_usuario_existente(self, mock_verify):
        """Usuario que ya existía inicia sesión directamente sin duplicar filas (isNewUser=False)."""
        # Pre-crear usuario tradicional
        user = User.objects.create_user(
            username="martina.google@gmail.com",
            email="martina.google@gmail.com",
            first_name="Martina",
            last_name="Lopez"
        )
        owner = Owner.objects.create(
            user=user,
            email="martina.google@gmail.com",
            firstName="Martina",
            lastName="Lopez"
        )
        mock_verify.return_value = self.mock_google_user

        initial_user_count = User.objects.count()
        initial_owner_count = Owner.objects.count()

        r = self.client.post(URL_GOOGLE_AUTH, {"idToken": "valid-id-token"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(r.data["isNewUser"])
        self.assertEqual(r.data["owner"]["idOwner"], owner.idOwner)

        # No se crearon nuevos registros
        self.assertEqual(User.objects.count(), initial_user_count)
        self.assertEqual(Owner.objects.count(), initial_owner_count)

    @patch("api.views.auth.verify_google_id_token")
    def test_google_auth_cuenta_eliminada(self, mock_verify):
        """Cuenta dada de baja lógica debe ser rechazada con 403 Forbidden."""
        user = User.objects.create_user(
            username="martina.google@gmail.com",
            email="martina.google@gmail.com"
        )
        Owner.objects.create(
            user=user,
            email="martina.google@gmail.com",
            firstName="Martina",
            lastName="Lopez",
            isDeleted=True
        )
        mock_verify.return_value = self.mock_google_user

        r = self.client.post(URL_GOOGLE_AUTH, {"idToken": "valid-id-token"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            r.data["detail"],
            "Esta cuenta ha sido eliminada. Comuníquese con soporte."
        )

    @patch("api.views.auth.verify_google_id_token")
    def test_google_auth_sin_email(self, mock_verify):
        """Si la respuesta de Google no incluye email, debe rechazar con 400 Bad Request."""
        data_without_email = dict(self.mock_google_user)
        data_without_email["email"] = ""
        mock_verify.return_value = data_without_email

        r = self.client.post(URL_GOOGLE_AUTH, {"idToken": "valid-id-token"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", r.data)


class VerifyGoogleIdTokenServiceTests(APITestCase):
    @patch("api.services.google_auth.id_token.verify_oauth2_token")
    def test_verify_service_exito(self, mock_verify):
        from api.services.google_auth import verify_google_id_token
        mock_verify.return_value = {"email": "test@gmail.com", "aud": "client-1"}
        with patch("api.services.google_auth.settings.GOOGLE_OAUTH_CLIENT_IDS", ["client-1"]):
            payload = verify_google_id_token("token-valido")
            self.assertEqual(payload["email"], "test@gmail.com")

    @patch("api.services.google_auth.id_token.verify_oauth2_token")
    def test_verify_service_audiencia_no_autorizada(self, mock_verify):
        from api.services.google_auth import verify_google_id_token
        mock_verify.return_value = {"email": "test@gmail.com", "aud": "client-desconocido"}
        with patch("api.services.google_auth.settings.GOOGLE_OAUTH_CLIENT_IDS", ["client-autorizado"]):
            with self.assertRaises(AuthenticationFailed):
                verify_google_id_token("token-valido")

    @patch("api.services.google_auth.id_token.verify_oauth2_token")
    def test_verify_service_error_google(self, mock_verify):
        from api.services.google_auth import verify_google_id_token
        mock_verify.side_effect = ValueError("Token expired")
        with self.assertRaises(AuthenticationFailed):
            verify_google_id_token("token-expirado")
