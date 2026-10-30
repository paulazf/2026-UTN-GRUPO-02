---
id: 0044
estado: Por implementar
autor: Martina Lopez
fecha: 29-10-2026
titulo: Autenticación e Inicio de Sesión con Google (Google Sign-In)
---

# TDD-0044: Autenticación e Inicio de Sesión con Google (Google Sign-In)

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El registro y login tradicional por formulario (email + contraseña) genera fricción en el usuario móvil: requiere escribir en teclados táctiles, recordar contraseñas complejas y realizar pasos de validación. Esto provoca abandono durante el onboarding.
- **Resultado esperado:** Proveer un mecanismo de autenticación en un solo toque (*"Continuar con Google"* / *Google Sign-In*) disponible tanto para **Android** como para **iOS**, integrado de manera transparente con la arquitectura existente del backend (`User` + `Owner` + Token DRF).
  - Si el usuario es nuevo, el sistema crea automáticamente su cuenta (`User` y perfil `Owner`) sin pedirle contraseñas ni formularios manuales.
  - Si el usuario ya se había registrado previamente con ese correo (incluso vía formulario tradicional), el sistema lo autentica directamente sin duplicar registros en la base de datos.
  - Si la cuenta asociada está dada de baja (`isDeleted = true`), se rechaza el acceso informando el estado.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario que busca inmediatez y seguridad al usar la aplicación, prefiriendo autenticarse mediante su cuenta de Google ya configurada en su teléfono móvil.
- **Equipo de desarrollo:** Requiere un flujo con validación criptográfica en el servidor (cero confianza en datos crudos del frontend) que respete las reglas de negocio de `Owner`, compatibilidad con tokens de DRF y soporte para Expo Go y builds nativos.

### User Story
**Como** tutor de una mascota,  
**quiero** registrarme e iniciar sesión utilizando mi cuenta de Google con un solo botón en la app móvil (Android e iOS),  
**para que** el acceso sea inmediato, seguro y no tenga que completar formularios ni recordar otra contraseña.

---

### Criterios de Aceptación

1. **Autenticación con cuenta existente (Login):**
   - Si el `email` obtenido y verificado a partir del token de Google ya existe en la base de datos:
     - Si el perfil `Owner` está activo (`isDeleted = false`), el sistema devuelve `200 OK` con el token de sesión de DRF y los datos serializados del perfil `Owner`.
     - Si el perfil `Owner` fue dado de baja (`isDeleted = true`), el sistema devuelve `403 Forbidden` con `{"detail": "Esta cuenta ha sido eliminada. Comuníquese con soporte."}`.
2. **Registro automático en un solo toque (Sign-up):**
   - Si el `email` verificado de Google no existe en el sistema:
     - El backend crea de forma atómica (`@transaction.atomic`) un `User` de Django con `username = email`, `email = email`, `first_name` y `last_name` extraídos del perfil de Google, y asigna una contraseña inutilizable (`set_unusable_password()`).
     - Se crea el perfil `Owner` asociado vinculado al `User`, con `phone = null` e `isDeleted = false`.
     - Se genera un token de autenticación de DRF (`authtoken_token`).
     - Devuelve `200 OK` (con flag opcional `isNewUser: true`) junto con el token y el perfil listo para operar.
3. **Validación Criptográfica Estricta (Seguridad):**
   - El frontend envía exclusivamente el `idToken` (JWT emitido y firmado por Google).
   - El backend valida la firma digital del token consultando los certificados públicos de Google (`google-auth`), asegurando que:
     - No esté vencido (`exp`).
     - El emisor sea de Google (`accounts.google.com` o `https://accounts.google.com`).
     - La audiencia (`aud`) coincida con alguno de los Client IDs autorizados del proyecto en Google Cloud Console.
   - Si el token es inválido, adulterado o expiró, devuelve `401 Unauthorized` con `{"detail": "El token de Google es inválido o ha expirado."}`.
4. **Validación de Payload:**
   - Si la petición a la API no incluye el campo `idToken` o está vacío, devuelve `400 Bad Request` con `{"detail": "Debe proporcionar el token de autenticación de Google (idToken)."}`.
5. **Compatibilidad Multiplataforma (Android & iOS):**
   - En el frontend, la solución contempla soporte dual:
     - **Modo Expo Go (Desarrollo):** Flujo mediante `expo-auth-session` / `expo-web-browser` compatible sin necesidad de prebuild nativo.
     - **Modo Standalone / Native Build (Producción):** Preparado para `@react-native-google-signin/google-signin` mediante Client IDs específicos de Android (con SHA-1) e iOS.
6. **Cierre de sesión y revocación:**
   - La sesión iniciada con Google opera bajo el mismo esquema de tokens DRF (`Token ${key}`). Al hacer logout, el token se revoca en base de datos (`POST /auth/logout/`) y se limpian las credenciales de `SecureStore`.

---

### Reglas de Negocio
- **Cero confianza en el cliente:** El backend nunca recibe ni confía en datos planos como `{ email, name }`. Solo confía en el `idToken` criptográfico validado con Google.
- **Contraseña inutilizable:** Las cuentas dadas de alta por Google no poseen contraseña local en texto plano ni hash vulnerable (`user.set_unusable_password()`), previniendo ataques de fuerza bruta al endpoint tradicional de login.
- **Normalización de Email:** El correo provisto por Google se normaliza siempre en minúsculas y sin espacios (`email.strip().lower()`).
- **Resguardo de Nombres:** Si el perfil de Google no suministra apellido (`family_name`), se extrae del nombre completo o se utiliza un valor por defecto consistente, garantizando que `firstName` y `lastName` no queden en blanco.
- **Formato de errores estándar:** Todas las respuestas de error utilizan la convención DRF `{"detail": "..."}` establecida en TDD-0042.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Infraestructura de Google Cloud Console:**
   - Proyecto creado en Google Cloud.
   - Pantalla de consentimiento OAuth configurada (nombre de la app, correos de soporte).
   - Credenciales creadas:
     - Web Client ID (utilizado por el backend para verificar el `aud` y por Expo Web).
     - Android Client ID (vinculado al package name y SHA-1 de desarrollo/producción).
     - iOS Client ID (vinculado al Bundle Identifier).
2. **Backend (Python / Django):**
   - Librería oficial: `google-auth` (`pip install google-auth`).
   - Variables de entorno en `core/settings.py`:
     - `GOOGLE_OAUTH_CLIENT_IDS`: Lista o tupla de Client IDs autorizados.
3. **Frontend (React Native / Expo):**
   - `expo-auth-session`, `expo-crypto`, `expo-web-browser`.
4. **TDD-0042 y Arquitectura de `Owner`:** Reutiliza el modelo `Owner`, `User`, sincronización de nombres y tokens DRF.

### Estimación
- **Estimación total:** **5 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Backend: Serializer, vista de validación de token de Google (`google-auth`), búsqueda/creación atómica de `User` + `Owner`, tests unitarios: *2 SP*.
  - Configuración Google Cloud Console y variables de entorno: *1 SP*.
  - Frontend: Integración de `expo-auth-session`, manejo de token en `LoginScreen` y conexión a `AuthContext`: *2 SP*.

---

## Diseño Técnico (RFC)

### Contrato de API

#### Endpoint: `POST /api/v1/auth/google/`
- **Permisos:** `AllowAny`.
- **Autenticación requerida:** Ninguna.

##### Request Body:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFhMmIzY..."
}
```

##### Respuestas:

**200 OK (Éxito - Login o Registro Completado):**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "owner": {
    "idOwner": 42,
    "firstName": "Martina",
    "lastName": "Lopez",
    "email": "martina.lopez@gmail.com",
    "phone": null
  },
  "isNewUser": false
}
```

**400 Bad Request (Falta `idToken`):**
```json
{
  "detail": "Debe proporcionar el token de autenticación de Google (idToken)."
}
```

**401 Unauthorized (Token Inválido o Vencido):**
```json
{
  "detail": "El token de Google es inválido o ha expirado."
}
```

**403 Forbidden (Cuenta dada de baja):**
```json
{
  "detail": "Esta cuenta ha sido eliminada. Comuníquese con soporte."
}
```

---

### Código de Referencia

#### 1. Backend: Servicio de Validación de Google (`backend/api/services/google_auth.py`)
```python
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

def verify_google_id_token(token_str: str) -> dict:
    """
    Verifica el idToken criptográfico emitido por Google.
    Retorna el diccionario con la información del usuario si es válido,
    o lanza AuthenticationFailed si el token es inválido o expiró.
    """
    try:
        # settings.GOOGLE_OAUTH_CLIENT_IDS contiene los Client IDs autorizados (Web, Android, iOS)
        id_info = id_token.verify_oauth2_token(
            token_str,
            requests.Request(),
            audience=None  # Se valida contra la lista de audiences permitidos a continuación
        )

        allowed_audiences = getattr(settings, 'GOOGLE_OAUTH_CLIENT_IDS', [])
        if allowed_audiences and id_info.get('aud') not in allowed_audiences:
            raise AuthenticationFailed("Audiencia de token no autorizada.")

        return id_info
    except ValueError as e:
        raise AuthenticationFailed("El token de Google es inválido o ha expirado.")
```

#### 2. Backend: Vista de Autenticación con Google (`backend/api/views/auth.py`)
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.db import transaction

from ..models.owner import Owner
from ..serializers.owner import OwnerSerializer
from ..services.google_auth import verify_google_id_token

class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("idToken")
        if not token_str:
            return Response(
                {"detail": "Debe proporcionar el token de autenticación de Google (idToken)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        google_data = verify_google_id_token(token_str)
        email = google_data.get("email", "").strip().lower()
        first_name = (google_data.get("given_name") or "").strip() or "Usuario"
        last_name = (google_data.get("family_name") or "").strip() or "Google"

        if not email:
            return Response(
                {"detail": "La cuenta de Google no posee un correo electrónico asociado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_new_user = False

        with transaction.atomic():
            user = User.objects.filter(username=email).first()

            if user:
                # Usuario existente: verificar si tiene perfil Owner y si está activo
                if hasattr(user, 'owner_profile'):
                    if user.owner_profile.isDeleted:
                        return Response(
                            {"detail": "Esta cuenta ha sido eliminada. Comuníquese con soporte."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    owner = user.owner_profile
                else:
                    # Caso borde: usuario Django preexistente sin Owner
                    owner = Owner.objects.create(
                        user=user,
                        email=email,
                        firstName=first_name,
                        lastName=last_name
                    )
            else:
                # Usuario nuevo: alta automática en una sola transacción
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name
                )
                user.set_unusable_password()
                user.save()

                owner = Owner.objects.create(
                    user=user,
                    email=email,
                    firstName=first_name,
                    lastName=last_name,
                    phone=None
                )
                is_new_user = True

            token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "owner": OwnerSerializer(owner).data,
            "isNewUser": is_new_user
        }, status=status.HTTP_200_OK)
```

#### 3. Frontend: Hook / Servicio de Google OAuth (`frontend/src/services/googleAuth.ts`)
```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

// Configuración de Client IDs provistos por Google Cloud Console
export const useGoogleAuthentication = () => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
  });

  return { request, response, promptAsync };
};
```

---

## Plan de Pruebas (Test Cases)

Se incorporarán las pruebas correspondientes a la suite de `test_owner.py` (o `test_google_auth.py`):

1. **`test_google_auth_sin_token`:** Petición POST vacía o sin `idToken` -> espera HTTP 400 con `detail`.
2. **`test_google_auth_token_invalido`:** Simulación de token adulterado o vencido -> espera HTTP 401 con `detail`.
3. **`test_google_auth_registro_nuevo_usuario`:** Mock de respuesta válida de Google con email inexistente -> espera HTTP 200, `isNewUser: true`, creación de `User` y `Owner` con `phone=None`, password inutilizable y token emitido.
4. **`test_google_auth_login_usuario_existente`:** Mock de Google con email de un usuario ya existente -> espera HTTP 200, `isNewUser: false`, no duplica registros en BD y devuelve su token.
5. **`test_google_auth_cuenta_eliminada`:** Mock de Google con email de una cuenta con `isDeleted = True` -> espera HTTP 403 con mensaje de cuenta eliminada.

---

## Plan de Implementación por Etapas

### Etapa 1: Backend & Dependencias
- [ ] Instalar dependencia `google-auth` en el contenedor del backend (`requirements.txt`).
- [ ] Configurar variables de entorno `GOOGLE_OAUTH_CLIENT_IDS` en `core/settings.py`.
- [ ] Implementar servicio `verify_google_id_token` en `api/services/google_auth.py`.
- [ ] Implementar vista `GoogleAuthView` en `api/views/auth.py` y registrar ruta `api/v1/auth/google/`.
- [ ] Implementar suite de pruebas unitarias (`test_google_auth.py`) con mocks de Google y verificar 100% de aprobación.

### Etapa 2: Google Cloud Console & Variables de Entorno
- [ ] Registrar Web Client ID, Android Client ID e iOS Client ID en Google Cloud Console.
- [ ] Configurar variables de entorno en backend (`.env`) y frontend (`.env`).

### Etapa 3: Frontend (Expo React Native)
- [ ] Instalar dependencias cliente en frontend: `expo-auth-session`, `expo-crypto`, `expo-web-browser`.
- [ ] Crear hook o helper de autenticación con Google.
- [ ] Conectar el botón *"Continuar con Google"* en `LoginScreen.tsx` (y opcionalmente en `RegisterScreen.tsx`).
- [ ] Manejar respuesta del backend y vincular sesión al `AuthContext` (`authContext.login(token, owner)`).

### Etapa 4: Verificación Integral
- [ ] Probar inicio de sesión con cuenta nueva (creación automática en BD).
- [ ] Probar inicio de sesión con cuenta preexistente (vinculación sin duplicación).
- [ ] Probar rechazo con cuenta dada de baja.
- [ ] Ejecutar suite completa de tests de backend (`python manage.py test`) para garantizar cero regresiones.
