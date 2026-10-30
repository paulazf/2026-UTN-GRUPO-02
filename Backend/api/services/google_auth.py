"""Servicio de verificación de tokens de Google (TDD-0044)."""

from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed


def verify_google_id_token(token_str: str) -> dict:
    """
    Verifica criptográficamente el idToken emitido por Google.
    Retorna el payload verificado con los datos del usuario,
    o lanza AuthenticationFailed si el token es inválido, expiró o no está autorizado.
    """
    try:
        id_info = id_token.verify_oauth2_token(
            token_str,
            requests.Request(),
            audience=None
        )

        allowed_audiences = getattr(settings, 'GOOGLE_OAUTH_CLIENT_IDS', [])
        if allowed_audiences and id_info.get('aud') not in allowed_audiences:
            raise AuthenticationFailed("La audiencia del token de Google no está autorizada.")

        return id_info
    except AuthenticationFailed:
        raise
    except Exception:
        raise AuthenticationFailed("El token de Google es inválido o ha expirado.")
