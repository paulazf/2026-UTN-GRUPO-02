---
id: 0000
estado: Por implementar
autor: Martina Lopez
fecha: 04-10-2026
titulo: Alta de Owner (Registro)
---

# TDD-0000: Alta de Owner (Registro)

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Para que cada persona pueda guardar y consultar la información de sus mascotas (mascotas, estudios, vacunas, turnos, etc.) necesita una cuenta propia. Hoy no existe ninguna forma de identificar al dueño, por lo que no se puede separar la información de un usuario de la de otro.
- **Resultado esperado:** Permitir que una persona se registre en la app móvil creando un `Owner`, y que quede con la sesión iniciada al terminar el registro (el servidor devuelve el token de autenticación junto con los datos del `Owner`).

### User Persona
- **Dueño / Tutor (`Owner`):** Persona que descarga la app por primera vez y quiere crear su cuenta con nombre, apellido, email y contraseña para empezar a cuidar a sus mascotas.

### User Story
**Como** dueño de una mascota, **quiero** crear una cuenta indicando mis datos básicos, **para que** toda la información que cargue quede asociada a mí y pueda volver a verla cuando inicie sesión.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si se envían `firstName`, `lastName`, `email` y `password` válidos, y no existe otro `Owner` **activo** (`isDeleted = false`) con ese email (ignorando mayúsculas/minúsculas y espacios en los extremos), el sistema crea el registro en `Owner` con `idOwner` autonumérico e `isDeleted = false`, guarda la contraseña **hasheada**, crea el token de autenticación y devuelve `201 Created` con el token y los datos del `Owner`.
- **Escenario de éxito (Email de una cuenta dada de baja):**
  - Si el email solo existe en cuentas con `isDeleted = true`, se permite crear la cuenta nueva (empieza de cero, ver TDD-0003).
- **Escenario de fallo (Datos faltantes o vacíos):**
  - Si falta `firstName`, `lastName`, `email` o `password`, o si `firstName` / `lastName` están compuestos solo por espacios, devuelve `400 Bad Request`.
- **Escenario de fallo (Email inválido):**
  - Si `email` no tiene un formato de email válido, devuelve `400 Bad Request`.
- **Escenario de fallo (Contraseña inválida):**
  - Si `password` tiene menos de 8 caracteres, devuelve `400 Bad Request`.
- **Escenario de fallo (Email duplicado / Case-Insensitive):**
  - Si ya existe un `Owner` activo con ese email (p. ej. "Valentina@Email.com" vs "valentina@email.com"), el sistema impide la creación y devuelve `409 Conflict`.

### Reglas de Negocio
- El **email es el identificador de inicio de sesión** (TDD-0001). Se compara sin distinguir mayúsculas de minúsculas y se guarda normalizado (sin espacios en los extremos y en minúsculas).
- La **contraseña distingue mayúsculas y minúsculas** ("Clave123" y "clave123" son contraseñas distintas) y no se recorta: los espacios cuentan como caracteres.
- Contraseña: mínimo **8 caracteres** y máximo 128. No se exigen otras reglas de complejidad en esta etapa.
- No pueden existir dos cuentas activas con el mismo email. Sí pueden existir una cuenta activa y varias dadas de baja con el mismo email.
- La contraseña **nunca** se devuelve en ninguna respuesta de la API.
- El campo "Confirmar contraseña" del formulario lo valida solo la app; el backend no lo recibe.
- Los campos `idOwner`, `isDeleted`, `created_at` y `token` no se aceptan en el body (si llegan, se ignoran).
- Fuera de alcance de este sprint: verificación de email y "Continuar con Google".

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Sin migraciones previas sobre el modelo de usuario:** Confirmado que no hay migraciones aplicadas que dependan de `auth.User`. Por eso se puede definir `AUTH_USER_MODEL = "api.Owner"` antes de la primera migración que lo involucre. **Si alguna base ya migró con `auth.User`, hay que recrearla.**
2. **Infraestructura de Base de Datos:** PostgreSQL con soporte de `UniqueConstraint` con expresión (`Lower`) y condición.
3. **Paquete `rest_framework.authtoken`:** Incluido en Django REST Framework, solo hay que agregarlo a `INSTALLED_APPS`.
4. **Mockup (Figma, "Autenticación"):** Pantallas de registro, error de email repetido y "¡Cuenta creada!".

### Estimación
- **Estimación total:** **5 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `Owner` (usuario personalizado), `OwnerManager`, configuración de autenticación (`AUTH_USER_MODEL`, `authtoken`, validador de contraseña) y migración: *2 SP*
  - `OwnerSerializer`, validación case-insensitive con `409`, endpoint `POST /api/v1/owner/` con creación de token y tests: *2 SP*
  - Pantallas Expo de registro y "¡Cuenta creada!", guardado del token en `expo-secure-store`: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower


class OwnerManager(BaseUserManager):
    use_in_migrations = True

    def get_by_natural_key(self, email):
        return self.get(email__iexact=email.strip(), isDeleted=False)

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El email es obligatorio")
        owner = self.model(email=email.strip().lower(), **extra_fields)
        owner.set_password(password)  
        owner.save(using=self._db)
        return owner

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class Owner(AbstractBaseUser, PermissionsMixin):
    idOwner = models.AutoField(primary_key=True, db_column="idOwner")
    firstName = models.CharField(max_length=100)
    lastName = models.CharField(max_length=100)
    email = models.EmailField(max_length=254) 
    phone = models.CharField(max_length=20, null=True, blank=True)
    isDeleted = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["firstName", "lastName"]

    objects = OwnerManager()

    @property
    def is_active(self):
        return not self.isDeleted

    class Meta:
        db_table = "owner"
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                condition=models.Q(isDeleted=False),
                name="unique_active_owner_email_case_insensitive",
            )
        ]

    def __str__(self):
        return self.email
```

### Configuración de autenticación

```python
# core/settings.py
AUTH_USER_MODEL = "api.Owner"

INSTALLED_APPS = [
    # ...
    "rest_framework",
    "rest_framework.authtoken",
    "api",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
]


SILENCED_SYSTEM_CHECKS = ["auth.E003", "auth.W004"]
```

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `POST /api/v1/owner/`
- **Autenticación:** No requiere (`AllowAny`).
- **Content-Type:** `application/json`

#### Request Body (JSON)

| Campo | Tipo | Obligatorio | Campo del mockup |
| --- | --- | --- | --- |
| `firstName` | STRING (máx. 100) | Sí | Nombre |
| `lastName` | STRING (máx. 100) | Sí | Apellido |
| `email` | STRING (máx. 254, formato email) | Sí | Email |
| `password` | STRING (mín. 8, máx. 128) | Sí | Contraseña |
| `phone` | STRING (máx. 20) | No | (no está en el formulario) |

```json
{
  "firstName": "Valentina",
  "lastName": "García",
  "email": "valentina@email.com",
  "password": "MiClave2026"
}
```

#### Response Body (`201 Created`)

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "owner": {
    "idOwner": 1,
    "firstName": "Valentina",
    "lastName": "García",
    "email": "valentina@email.com",
    "phone": null,
    "isDeleted": false,
    "created_at": "2026-10-04T10:45:00Z"
  }
}
```

#### Response Body (`409 Conflict`, ejemplo)

```json
{
  "email": ["Este email ya está registrado."]
}
```

#### Response Body (`400 Bad Request`, ejemplo)

```json
{
  "password": ["La contraseña debe tener al menos 8 caracteres."]
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo)**:
   - La pantalla "Crear cuenta" valida en el cliente que las contraseñas coincidan ("Las contraseñas no coinciden") y la longitud mínima.
   - Envía `POST /api/v1/owner/` con `firstName`, `lastName`, `email` y `password` (sin el campo de confirmación).
   - Al recibir `201`, guarda el `token` en `expo-secure-store` y los datos del `owner` en el estado de la app, y muestra la pantalla "¡Cuenta creada!". El botón "Comenzar" entra a la app sin pasar por el login.
2. **Servidor (Django REST Framework)**:
   - `OwnerViewSet` (acción `create`) con `permission_classes = [AllowAny]`.
   - `OwnerSerializer`:
     - `validate_firstName` / `validate_lastName`: `strip()` y rechazo de cadenas vacías.
     - `validate_email`: `strip().lower()` y verificación de que no exista un `Owner` activo con ese email (`Owner.objects.filter(email__iexact=email, isDeleted=False).exists()`). Si existe, lanza una excepción propia (`APIException` con `status_code = 409`), porque un `ValidationError` devolvería `400`.
     - `validate_password`: aplica `validate_password()` de Django (mínimo 8) y el máximo de 128. `password` es `write_only`.
     - `idOwner`, `isDeleted`, `created_at` son de solo lectura.
   - `create()`: usa `Owner.objects.create_user(...)` (hashea la contraseña) y luego `Token.objects.create(user=owner)`. Ambas operaciones dentro de `transaction.atomic`, para que no quede un `Owner` sin token.
   - Si dos solicitudes simultáneas pasan el chequeo a la vez, la restricción única de PostgreSQL lanza `IntegrityError`, que se captura y se convierte también en `409 Conflict`.
3. **Respuesta**:
   - Devuelve `201 Created` con `{ token, owner }`.

### Impacto en otros TDD (a coordinar con el equipo)
- **TDD-0004 (Alta de Mascota):** el body incluye `idOwner`. Con autenticación por token, el dueño debería tomarse de `request.user` y no del body, para que nadie pueda crear mascotas a nombre de otro. Se sugiere quitar `idOwner` del payload (o ignorarlo).
- **TDD-0010 / 0011 / 0012 / 0013 (Estudios):** ya referencian el TDD-0001 como dependencia de autenticación y filtran por `request.user`. Quedan alineados con este diseño.
- **Los endpoints deben declarar `IsAuthenticated`** para devolver `401` sin credenciales.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Registro correcto** | Datos válidos, email nuevo. Se crea el `Owner` con la contraseña hasheada y se devuelve el token. | `201 Created` |
| **Registro sin teléfono** | No se envía `phone`. Queda `null`. | `201 Created` |
| **Email normalizado** | Se envía " Valentina@Email.COM ". Se guarda `valentina@email.com`. | `201 Created` |
| **Email de cuenta dada de baja** | Existe una cuenta con ese email y `isDeleted = true`. Se crea una cuenta nueva. | `201 Created` |
| **Campo faltante** | Falta `firstName`, `lastName`, `email` o `password`. | `400 Bad Request` |
| **Nombre o apellido solo con espacios** | `"   "` en `firstName` o `lastName`. | `400 Bad Request` |
| **Nombre demasiado largo** | `firstName` o `lastName` de más de 100 caracteres. | `400 Bad Request` |
| **Email inválido** | `"valentina@"` o `"valentina"`. | `400 Bad Request` |
| **Contraseña corta** | `password` de 7 caracteres. | `400 Bad Request` |
| **Contraseña de exactamente 8 caracteres** | Se acepta. | `201 Created` |
| **Contraseña demasiado larga** | `password` de más de 128 caracteres. | `400 Bad Request` |
| **Email duplicado exacto** | Ya existe un `Owner` activo con ese email. | `409 Conflict` |
| **Email duplicado con otra capitalización** | Existe "valentina@email.com" y se envía "VALENTINA@Email.com". | `409 Conflict` |
| **Registros simultáneos con el mismo email** | La restricción única de la base impide el segundo. | `409 Conflict` |
| **Campos protegidos en el body** | Se envía `idOwner`, `isDeleted: true` o `is_staff: true`. Se ignoran. | `201 Created` |
| **Contraseña en la respuesta** | La respuesta no incluye `password` ni su hash. | `201 Created` |
| **Contraseña con mayúsculas** | Se guarda con su capitalización: iniciar sesión con otra capitalización falla (TDD-0001). | `201 Created` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. No debe quedar un `Owner` sin token. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Persistencia y Modelo:**
   - Definir `OwnerManager` y el modelo `Owner` en `Backend/api/models.py`, con la restricción única case-insensitive condicional.
   - Configurar en `core/settings.py` `AUTH_USER_MODEL`, `rest_framework.authtoken`, `DEFAULT_AUTHENTICATION_CLASSES`, `AUTH_PASSWORD_VALIDATORS` y `SILENCED_SYSTEM_CHECKS`.
   - Generar y ejecutar las migraciones (`python manage.py makemigrations` y `migrate`). Hacerlo con la base sin migraciones previas de usuario.
2. **Etapa 2 - Serializer y Lógica de Negocio:**
   - Crear `OwnerSerializer` en `Backend/api/serializers.py` con las validaciones, la excepción `409` y la creación del token dentro de una transacción.
3. **Etapa 3 - Endpoint y Enrutamiento:**
   - Definir `OwnerViewSet` en `Backend/api/views.py` con la acción `create` (`AllowAny`).
   - Registrar la ruta `owner/` en el router de `api/v1/`.
4. **Etapa 4 - Integración Móvil (Frontend Expo):**
   - Implementar `POST /api/v1/owner/` en `Frontend/src/services/api.ts`.
   - Guardar el token con `expo-secure-store` y construir las pantallas "Crear cuenta" y "¡Cuenta creada!".
5. **Etapa 5 - Tests:**
   - Tests con `APITestCase` de cada caso de la tabla, incluyendo el email duplicado con distinta capitalización y el email de una cuenta dada de baja.
