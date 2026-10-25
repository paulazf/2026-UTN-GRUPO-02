---
id: 0038
estado: Por implementar
autor: Martina Lopez
fecha: 25-10-2026
titulo: Mejoras de Validación, Consistencia y Pruebas de Owner
---

# TDD-0014: Mejoras de Validación, Consistencia y Pruebas de Owner

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** La implementación actual de `Owner` (registro, login, perfil, cambio de contraseña y baja) funciona, pero tiene huecos que afectan al usuario y al equipo:
  1. Se pueden guardar nombres o teléfonos compuestos solo por espacios, y contraseñas débiles (por ejemplo, `1`, `a` o `12345678`).
  2. La baja de la cuenta toca varias tablas (`Owner`, `User`, token) sin garantía de que se completen juntas.
  3. No existe ninguna suite de pruebas para `Owner`, y el código de las vistas repite el mismo chequeo del perfil en cada método.
  4. Nombre y apellido se guardan solo en `Owner`: los campos `first_name` y `last_name` del `User` de Django quedan siempre vacíos.
  5. Las respuestas de error no son consistentes: algunas usan la clave `error` y otras `detail`.
- **Resultado esperado:** Un flujo de cuenta consistente y robusto: validaciones claras, baja lógica atómica y una suite de pruebas que cubra todo el ciclo de vida del `Owner`, sin cambiar las rutas ni el contrato general de la API.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario que se registra, inicia sesión, edita su perfil, cambia su contraseña y puede dar de baja su cuenta.
- **Equipo de desarrollo:** Necesita código mantenible y pruebas que protejan la autenticación, de la que dependen Pet, Estudios y el resto de las entidades.

### User Story
**Como** dueño de una mascota, **quiero** que la app me avise con claridad si mi contraseña es débil, **para que** crear y mantener mi cuenta sea simple y segura.

**Como** integrante del equipo, **quiero** una suite de pruebas y un código de vistas sin duplicación para `Owner`, **para que** los cambios en autenticación no rompan el resto de la app.

### Criterios de Aceptación
- **Escenario de éxito (Registro con datos válidos):**
  - Si el email, el nombre y el apellido son válidos y la contraseña cumple la política, el sistema crea el `User` y el `Owner`, y devuelve `201 Created`. Nombre, apellido y teléfono se guardan sin espacios en los extremos, y nombre y apellido se copian también a `first_name` y `last_name` del `User`.
- **Escenario de fallo (Nombre inválido):**
  - Si `firstName` o `lastName` están vacíos o compuestos solo por espacios, devuelve `400 Bad Request`.
- **Escenario de fallo (Contraseña débil):**
  - Si la contraseña no cumple la política de contraseñas (ver "Reglas de Negocio"), tanto en el registro como en el cambio de contraseña, devuelve `400 Bad Request` indicando el motivo.
- **Escenario de fallo (Nueva contraseña igual a la actual):**
  - Si en el cambio de contraseña `newPassword` es idéntica a `currentPassword`, devuelve `400 Bad Request`.
- **Escenario de éxito (Edición de perfil sincronizada):**
  - Al editar el perfil, el `Owner` y los campos `first_name` y `last_name` del `User` se actualizan juntos, en una sola transacción: o se aplican los dos cambios o ninguno. Un teléfono compuesto solo por espacios se guarda como `null`.
- **Escenario de fallo (Errores sin campo):**
  - Los errores que no corresponden a un campo (perfil inexistente, sin sesión, etc.) se devuelven siempre como `{"detail": "..."}`. La clave `error` deja de usarse.
- **Escenario de éxito (Baja de cuenta atómica):**
  - Al dar de baja la cuenta, la marca `isDeleted`, la desactivación del `User` y la eliminación del token ocurren **todas o ninguna**. Después de la baja la persona no puede iniciar sesión y su token no sirve.
- **Escenario de éxito (Pruebas):**
  - Existe una suite automatizada que cubre registro, login, perfil, cambio de contraseña y baja, y se ejecuta sin errores.

### Reglas de Negocio
- **Política de contraseñas:** se usan los validadores de Django configurados en `AUTH_PASSWORD_VALIDATORS`:
  - largo mínimo de 8 caracteres,
  - no puede ser una contraseña común (por ejemplo, `password123`),
  - no puede ser solo numérica,
  - no puede ser demasiado parecida al email o al nombre.
  La contraseña sigue distinguiendo mayúsculas de minúsculas y tiene un máximo de 128 caracteres.
- **Email:** se guarda y se evalúa sin espacios en los extremos y en minúsculas tanto al registrarse como al iniciar sesión (`strip().lower()`). Máximo **150 caracteres**, porque se usa como `username` de Django, que admite hasta 150. Su unicidad no cambia en este TDD (`unique=True`).
- **Nombres:** `firstName` y `lastName` se guardan con `strip()`; no pueden quedar vacíos. Máximo **150 caracteres**, porque se copian a `first_name` y `last_name` del `User`, que admiten hasta 150 (el modelo `Owner` permite 255, pero la API no acepta más de 150).
- **Teléfono:** `phone` es opcional y se guarda con `strip()`. Si queda vacío después de recortar, se guarda como `null`. Máximo 50 caracteres.
- **Dónde vive cada dato:** el `User` de Django guarda las credenciales (`username`, `password`, `is_active`); el `Owner` guarda los datos del perfil y es la fuente de verdad. El email es el `username` del `User` y el `email` del `Owner`. Nombre y apellido se **copian** a `first_name` y `last_name` del `User` al registrarse y cada vez que se edita el perfil, para que todo Django tenga los datos correctos. `User.email` no se usa.
- **Baja de cuenta:** además de `Owner.isDeleted = true`, se desactiva el `User` (`is_active = false`), se elimina el token y se libera el email prefijándolo con `deleted_<uuid>_...` tanto en `Owner` como en `User` para que la persona pueda volver a registrarse en el futuro. Los datos asociados (mascotas, estudios, etc.) no se tocan.
- **Cierre de sesión (`Logout`):** se realiza de forma idempotente con `Token.objects.filter(user=request.user).delete()`, devolviendo siempre `{"detail": "Sesión cerrada exitosamente."}` sin generar errores `500` si el token ya no existía.
- **Formato de errores:** se sigue la convención de Django REST Framework en todos los endpoints (incluyendo `Login` y `Logout`). Los errores que no corresponden a un campo (`400`, `401`, `403`, `404`) se devuelven siempre como `{"detail": "..."}` y **se elimina la clave `error`**. Los errores de validación de un campo se devuelven por campo (`{"email": ["..."]}`): también es la convención de DRF y es lo que la app necesita para mostrarlos bajo cada campo del formulario (según el Figma).
- **Sin cambios de rutas:** este TDD no modifica ninguna ruta ni el contrato de éxito de los endpoints existentes de `Owner`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Implementación vigente de `Owner`:** modelo `Owner` enlazado a `User` (`OneToOneField`, `related_name="owner_profile"`), con registro, login, perfil, cambio de contraseña y baja ya funcionando.
2. **TDD-0000 a TDD-0003:** definen las reglas de negocio de la cuenta. Este TDD las toma como base y las ajusta donde la implementación usa dos modelos (ver "Relación con TDD-0000 a TDD-0003").
3. **Token de DRF (`rest_framework.authtoken`):** ya configurado.

### Estimación
- **Estimación total:** **5 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Validaciones en serializers (contraseña, nombres y teléfono con `strip()`, nueva contraseña distinta de la actual): *2 SP*
  - Vistas y modelo (`__str__`, `full_name`, perfil centralizado, errores con `detail`, sincronización de nombres con `User`, edición y baja atómicas, migración de datos de los nombres existentes): *1 SP*
  - Suite de pruebas de `Owner`: *2 SP*

---

## Diseño Técnico (RFC)

### Relación con TDD-0000 a TDD-0003
Los TDD 0000 a 0003 describen un único modelo `Owner` que es el usuario de Django. La implementación usa **dos modelos**. Este TDD documenta esa realidad y no reemplaza a los anteriores, que siguen siendo la referencia de las reglas de negocio. Las diferencias son:

| Tema | TDD-0000 a 0003 | Implementación (este TDD) |
| --- | --- | --- |
| Modelo de usuario | `Owner` es el usuario de Django | `User` de Django + `Owner` enlazado por `user` |
| `request.user` | Es un `Owner` | Es un `User`; el perfil se obtiene con `request.user.owner_profile` |
| Contraseña y estado de la cuenta | Columnas de `owner` | Columnas de `auth_user` (`password`, `is_active`) |
| Token de DRF | Apunta a `Owner` | Apunta a `User` (`authtoken_token.user_id`) |
| Nombre y apellido | Solo en `Owner` | En `Owner` y copiados a `User.first_name` y `User.last_name` |
| Baja de cuenta | `isDeleted = true` y token eliminado | Además, `User.is_active = false` |

### Cambios al DER
Como la implementación usa dos tablas, el DER debe mostrar estas columnas (las marcadas ⚠️ **difieren de lo que se había graficado**):

**Tabla `owner`:**

| Columna | Tipo | Nulo | Observación |
| --- | --- | --- | --- |
| `idOwner` | INT PK | No | |
| `user_id` ⚠️ | INT FK, único | No | Enlace 1 a 1 con `auth_user.id`. |
| `firstName` | STRING (255) | No | |
| `lastName` | STRING (255) | No | |
| `email` | STRING (254) | No | Único. |
| `phone` | STRING (50) | Sí | |
| `isDeleted` | BOOLEAN | No | |
| `created_at` | DATETIME | No | |
| `updated_at` | DATETIME | No | |

**Tabla `auth_user`** (de Django; aquí viven las credenciales). Se grafican solo las columnas que usa la app:

| Columna | Tipo | Observación |
| --- | --- | --- |
| `id` | INT PK | |
| `username` | STRING (150), único | Email en minúsculas. |
| `password` | STRING (128) | Hash. |
| `is_active` | BOOLEAN | `false` cuando la cuenta se da de baja. |
| `first_name` | STRING (150) | Copia de `owner.firstName`. |
| `last_name` | STRING (150) | Copia de `owner.lastName`. |

Las columnas `password`, `last_login`, `is_staff` e `is_superuser` **no** pertenecen a `owner`: son de `auth_user`.

**Tabla `authtoken_token`:** `key` (STRING (40) PK), `user_id` (INT FK único hacia `auth_user.id`), `created` (DATETIME).

**Relaciones:** `auth_user` 1 — 1 `owner`; `auth_user` 1 — 1 `authtoken_token`; `owner` 1 — N `pet`.

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.contrib.auth.models import User


class Owner(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="owner_profile")
    idOwner = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=255)
    lastName = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=50, blank=True, null=True)

    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "owner"

    @property
    def full_name(self):
        return f"{self.firstName} {self.lastName}".strip()

    def __str__(self):
        return f"{self.full_name} ({self.email})"
```

Cambios respecto del modelo actual: solo se agregan la propiedad `full_name` y el nuevo `__str__`. No se agregan ni se quitan columnas ni restricciones: `email` mantiene `unique=True`.

### Configuración de contraseñas

```python
# core/settings.py
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
```

### Contrato de API (cambios en las respuestas de error)

No cambian rutas, métodos ni respuestas de éxito. Cambian estas respuestas de error.

#### Contraseña débil (`400 Bad Request`, ejemplo)

```json
{
  "password": [
    "Esta contraseña es demasiado común.",
    "Esta contraseña es completamente numérica."
  ]
}
```

#### Nombre inválido (`400 Bad Request`, ejemplo)

```json
{
  "firstName": ["Este campo no puede estar vacío."]
}
```

#### Nueva contraseña igual a la actual (`400 Bad Request`)

```json
{
  "newPassword": ["La nueva contraseña debe ser distinta de la actual."]
}
```

#### Perfil inexistente o dado de baja (`404 Not Found`)

```json
{
  "detail": "Perfil no encontrado."
}
```

### Código de referencia

```python
# backend/api/serializers/owner.py
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    # CharField recorta espacios (trim_whitespace=True) y rechaza cadenas vacías
    firstName = serializers.CharField(max_length=150)
    lastName = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        # Usuario temporal (sin guardar) para el validador de similitud
        candidato = User(username=attrs["email"], first_name=attrs["firstName"],
                         last_name=attrs["lastName"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user=candidato)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data["firstName"],   # copia en User
                last_name=validated_data["lastName"],
            )
            return Owner.objects.create(
                user=user,
                firstName=validated_data["firstName"],
                lastName=validated_data["lastName"],
                email=validated_data["email"],
            )


class OwnerUpdateSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(max_length=150, required=False)
    lastName = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Owner
        fields = ["firstName", "lastName", "phone"]

    def validate_phone(self, value):
        value = (value or "").strip()
        return value or None          # vacío o solo espacios -> null


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True, trim_whitespace=False)
    newPassword = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["currentPassword"]):
            raise serializers.ValidationError({"currentPassword": ["La contraseña actual es incorrecta."]})
        if attrs["newPassword"] == attrs["currentPassword"]:
            raise serializers.ValidationError({"newPassword": ["La nueva contraseña debe ser distinta de la actual."]})
        try:
            validate_password(attrs["newPassword"], user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"newPassword": list(e.messages)})
        return attrs
```

```python
# backend/api/views/owner.py
def sync_user_names(user, owner):
    """Copia nombre y apellido del Owner al User de Django."""
    user.first_name = owner.firstName
    user.last_name = owner.lastName
    user.save(update_fields=["first_name", "last_name"])


class OwnerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_owner(self):
        """Único lugar donde se obtiene el perfil del usuario autenticado."""
        owner = getattr(self.request.user, "owner_profile", None)
        if owner is None or owner.isDeleted:
            raise NotFound("Perfil no encontrado.")   # -> {"detail": "Perfil no encontrado."}
        return owner

    def get(self, request):
        return Response(OwnerSerializer(self.get_owner()).data)

    @transaction.atomic
    def patch(self, request):
        owner = self.get_owner()
        serializer = OwnerUpdateSerializer(owner, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        owner = serializer.save()
        sync_user_names(request.user, owner)          # Owner y User cambian juntos
        return Response(OwnerSerializer(owner).data)

    @transaction.atomic
    def delete(self, request):
        owner = self.get_owner()
        user = request.user
        owner.isDeleted = True

        # Liberar email para que pueda volver a usarse
        new_email = f"deleted_{uuid.uuid4().hex[:8]}_{owner.email}"
        owner.email = new_email
        owner.save(update_fields=["isDeleted", "email", "updated_at"])

        user.username = new_email
        user.email = new_email
        user.is_active = False
        user.save(update_fields=["username", "email", "is_active"])

        Token.objects.filter(user=user).delete()      # no falla si no hay token
        return Response(status=status.HTTP_204_NO_CONTENT)
```
---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo)**:
   - Los formularios de registro y cambio de contraseña muestran los errores devueltos por campo (`email`, `password`, `newPassword`, etc.).
   - Ante un `400` de contraseña, muestra el primer mensaje devuelto bajo el campo de contraseña.
2. **Servidor (Django REST Framework)**:
   - **Registro:** normaliza el email, valida la contraseña con los validadores de Django usando un usuario temporal, y crea el `User` (con `first_name` y `last_name`) y el `Owner` dentro de una transacción.
   - **Vistas:** el perfil se obtiene en un único método, `get_owner()`, que lanza `NotFound` (`404` con `{"detail": "Perfil no encontrado."}`) si el usuario no tiene perfil o está dado de baja. Se elimina la repetición del chequeo en `get`, `patch` y `delete` y la clave `error`.
   - **Edición de perfil:** `patch` recorta `firstName`, `lastName` y `phone` (un teléfono vacío queda en `null`), guarda el `Owner` y copia nombre y apellido al `User` en una sola transacción.
   - **Baja:** una sola transacción (`@transaction.atomic`) marca `isDeleted`, desactiva el `User` y elimina el token. Si algo falla, no se aplica ningún cambio.
3. **Persistencia / Relaciones**:
   - La FK de `Pet` hacia `Owner` no cambia. Las mascotas y demás datos de una cuenta dada de baja se conservan.
4. **Respuesta**:
   - Los errores de validación se devuelven por campo; el resto, como `{"detail": "..."}`.

### Compatibilidad con los TDD existentes
- Este TDD **no modifica ningún contrato** de Pet, Estudios ni de otras entidades, y no cambia rutas.
- Como `request.user` es un `User`, el filtro por dueño en otras entidades se expresa como `owner=request.user.owner_profile` (o `owner__user=request.user`). Es la forma que ya requiere la implementación vigente; este TDD no la altera.

---

## Casos de Prueba y Casos de Borde

### Registro

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Registro correcto** | Datos válidos. Se crean `User` y `Owner`. | `201 Created` |
| **Nombres con espacios en los extremos** | `"  Valentina "` se guarda como `"Valentina"`. | `201 Created` |
| **Email normalizado** | `" Valentina@Email.COM "` se guarda en minúsculas y sin espacios. | `201 Created` |
| **Nombre o apellido vacío** | `""` o ausente. | `400 Bad Request` |
| **Nombre o apellido solo con espacios** | `"   "`. | `400 Bad Request` |
| **Nombre demasiado largo** | Más de 150 caracteres. | `400 Bad Request` |
| **Nombres copiados al `User`** | Tras el registro, `user.first_name` y `user.last_name` coinciden con `firstName` y `lastName`. | `201 Created` |
| **Email inválido** | `"valentina@"`. | `400 Bad Request` |
| **Email demasiado largo** | Más de 150 caracteres. | `400 Bad Request` |
| **Contraseña corta** | 7 caracteres. | `400 Bad Request` |
| **Contraseña común** | `password123`. | `400 Bad Request` |
| **Contraseña solo numérica** | `12345678`. | `400 Bad Request` |
| **Contraseña parecida al email** | `valentina@email.com` o `valentina2026` para ese usuario. | `400 Bad Request` |
| **Contraseña de 8 caracteres válida** | Se acepta. | `201 Created` |
| **Falta un campo obligatorio** | Sin `email` o sin `password`. | `400 Bad Request` |

### Login

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Login correcto** | Credenciales válidas. Devuelve token. | `200 OK` |
| **Email con otra capitalización** | Entra igual. | `200 OK` |
| **Email con espacios en los extremos** | `"  valentina@email.com  "` entra igual tras aplicar `strip()`. | `200 OK` |
| **Falta email o contraseña** | Respuesta genérica con `detail`: `"Debe proporcionar email y contraseña."`. | `400 Bad Request` |
| **Contraseña incorrecta** | Mismo mensaje genérico que el email inexistente (`detail`: `"Credenciales inválidas."`). | `401 Unauthorized` |
| **Email inexistente** | Mismo mensaje genérico con `detail`. | `401 Unauthorized` |
| **Cuenta dada de baja** | No puede iniciar sesión (`401 Unauthorized`). | `401 Unauthorized` |

### Logout

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Logout correcto** | Elimina el token del usuario y responde `{"detail": "Sesión cerrada exitosamente."}`. | `200 OK` |
| **Logout idempotente** | Si el usuario ya no tenía token activo o reintenta, responde `200 OK` sin error 500. | `200 OK` |
| **Sin sesión** | Petición sin token. | `401 Unauthorized` |

### Perfil

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Consulta del perfil propio** | Devuelve los datos del `Owner` autenticado. | `200 OK` |
| **Edición parcial** | Se envía solo `firstName`. El resto no cambia. | `200 OK` |
| **Teléfono con espacios en los extremos** | `"  221 555 0123 "` se guarda sin espacios. | `200 OK` |
| **Teléfono solo con espacios** | Se guarda como `null`. | `200 OK` |
| **Edición sincroniza el `User`** | Tras editar el perfil, `user.first_name` y `user.last_name` coinciden con los del `Owner`, incluso si solo se editó `phone`. | `200 OK` |
| **Edición atómica** | Si falla el guardado del `User` (se simula un error), el `Owner` no queda modificado. | `500 Internal Server Error` |
| **Formato del error de perfil inexistente** | La respuesta es `{"detail": "Perfil no encontrado."}` y no contiene la clave `error`. | `404 Not Found` |
| **Edición con nombre vacío o solo espacios** | No se modifica nada. | `400 Bad Request` |
| **Sin sesión** | Petición sin token. | `401 Unauthorized` |
| **Usuario sin perfil de `Owner`** | Por ejemplo, un superusuario del panel `/admin` con token. | `404 Not Found` |

### Cambio de contraseña

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Cambio correcto** | Actual correcta y nueva válida. | `200 OK` |
| **Login tras el cambio** | Entra con la contraseña nueva; la anterior ya no sirve. | `200 OK` / `401 Unauthorized` |
| **Contraseña actual incorrecta** | `currentPassword` errónea. | `400 Bad Request` |
| **Nueva igual a la actual** | `newPassword == currentPassword`. | `400 Bad Request` |
| **Nueva débil** | Corta, común o solo numérica. | `400 Bad Request` |
| **Sin sesión** | Petición sin token. | `401 Unauthorized` |

### Baja de cuenta

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja correcta** | `Owner.isDeleted = true`, `User.is_active = false`, token eliminado. | `204 No Content` |
| **Token tras la baja** | Una petición con el token anterior. | `401 Unauthorized` |
| **Login tras la baja** | Con las credenciales de la cuenta eliminada. | `401 Unauthorized` |
| **Datos conservados** | Las mascotas de la cuenta eliminada siguen en la base. | — |
| **Baja atómica** | Si falla uno de los pasos (se simula un error al eliminar el token), no queda ningún cambio aplicado. | `500 Internal Server Error` |
| **Sin sesión** | Petición sin token. | `401 Unauthorized` |

---

## Ajustes al mockup (Figma)
- **Registro y cambio de contraseña:** agregar los mensajes de contraseña débil que antes no existían:
  - "Esta contraseña es demasiado común."
  - "La contraseña no puede ser solo numérica."
  - "La contraseña es muy parecida a tus datos."
- **Cambio de contraseña:** agregar el mensaje "La nueva contraseña debe ser distinta de la actual."

---

## Plan de Implementación

1. **Etapa 1 - Modelo y migración de datos (Backend):**
   - En `backend/api/models/owner.py`: agregar la propiedad `full_name` y el nuevo `__str__`. No cambian columnas ni restricciones, así que no se genera una migración de esquema ni hace falta recrear la base.
   - Crear una migración de datos (`RunPython`) que copie `firstName` y `lastName` de cada `Owner` existente a `first_name` y `last_name` de su `User` (recortados a 150 caracteres), para que las cuentas ya creadas queden sincronizadas.
2. **Etapa 2 - Serializers (Backend):**
   - En `backend/api/serializers/owner.py`: registro (nombres con `strip()` y máximo 150, validadores de contraseña, email máximo 150, copia de nombres al `User`), `OwnerUpdateSerializer` (`strip()` en nombres y teléfono, teléfono vacío como `null`) y `ChangePasswordSerializer` (nueva distinta de la actual y validadores).
   - En `core/settings.py`: configurar `AUTH_PASSWORD_VALIDATORS`.
3. **Etapa 3 - Vistas (Backend):**
   - En `backend/api/views/owner.py`: centralizar la obtención del perfil en `get_owner()` y reemplazar todas las respuestas `{"error": ...}` por `detail`.
   - Aplicar `@transaction.atomic` a `patch` (con `sync_user_names`) y a `delete`. En la baja, usar `Token.objects.filter(user=user).delete()` en lugar de `user.auth_token.delete()`, que falla si el usuario no tiene token.
   - En `backend/api/views/auth.py`: normalizar email en `LoginView` con `strip().lower()`, reemplazar todas las respuestas `{"error": ...}` por `detail`, y en `LogoutView` usar `Token.objects.filter(user=request.user).delete()` para un cierre de sesión seguro e idempotente.
4. **Etapa 4 - Tests:**
   - Crear `backend/api/test_owner.py` con `APITestCase` y cubrir cada caso de las tablas anteriores, incluyendo la atomicidad de la baja.
5. **Etapa 5 - DER y mockup:**
   - Actualizar el DER con las tablas `owner`, `auth_user` y `authtoken_token` descritas arriba.
   - Agregar al Figma los mensajes nuevos.

---

## Supuestos a confirmar
- Se mantiene la arquitectura de dos modelos (`User` + `Owner`).
- Política de contraseñas con los validadores de Django. Cambia la regla anterior de "solo mínimo 8 caracteres" (TDD-0000).
- Los mensajes de los validadores de Django salen en el idioma configurado en `LANGUAGE_CODE`. Cambiarlo es una decisión global que afectaría a otras entidades, por eso no forma parte de este TDD. Los ejemplos de arriba están en español.
- La consulta de perfil existe en el código, pero no tiene TDD propio; aquí solo se cubre con pruebas.
- Las rutas de los endpoints no cambian. Este TDD no las enumera porque no se modifican.
- `first_name` y `last_name` del `User` se mantienen sincronizados con el `Owner`; `User.email` no se usa.
- La clave `error` desaparece de todas las respuestas. Los errores de validación de campo siguen siendo por campo (convención de DRF) porque la app los necesita bajo cada campo del formulario. Si se quisiera que absolutamente todo vaya en `detail`, habría que rediseñar cómo la app muestra los errores de los formularios.
- El teléfono solo se recorta; no se valida su formato.
- Se mantiene del plan anterior la suite de pruebas completa.
- El email sigue siendo `unique=True`. Para permitir que un usuario dado de baja pueda volver a registrarse con su mismo email en el futuro, la baja de la cuenta libera el email original renombrándolo con el prefijo `deleted_<uuid>_` tanto en `Owner` como en `User`.
