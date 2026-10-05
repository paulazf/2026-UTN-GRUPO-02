---
id: 0002
estado: Por implementar
autor: Martina Lopez
fecha: 04-10-2026
titulo: Modificación de Owner y Cambio de Contraseña
---

# TDD-0002: Modificación de Owner y Cambio de Contraseña

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los datos del perfil cambian o se cargaron mal (nombre, apellido, teléfono, etc). Además, el dueño necesita poder cambiar su contraseña cuando quiera, por ejemplo si cree que alguien la conoce.
- **Resultado esperado:** Permitir que el `Owner` autenticado modifique sus datos de perfil y cambie su contraseña desde la app móvil, sin afectar a sus mascotas ni al resto de su información.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario con sesión iniciada que quiere mantener actualizado su perfil y proteger su cuenta.

### User Story
**Como** dueño de una mascota, **quiero** modificar mis datos de perfil y cambiar mi contraseña, **para que** mi cuenta tenga mi información correcta y esté segura.

### Criterios de Aceptación
- **Escenario de éxito (Modificar perfil):**
  - Si el `Owner` autenticado envía al menos uno de `firstName`, `lastName` o `phone` con valores válidos, el sistema actualiza solo los campos enviados y devuelve `200 OK` con los datos del `Owner`.
- **Escenario de éxito (Cambiar contraseña):**
  - Si el `Owner` autenticado envía su contraseña actual correcta (`currentPassword`) y una contraseña nueva válida (`newPassword`), el sistema guarda el nuevo hash, reemplaza el token de la sesión por uno nuevo y devuelve `200 OK` con el token nuevo.
- **Escenario de fallo (Sin sesión):**
  - Si la petición no incluye un token válido, devuelve `401 Unauthorized`.
- **Escenario de fallo (Datos inválidos):**
  - Si `firstName` o `lastName` se envían vacíos o solo con espacios, o `phone` tiene un formato inválido, devuelve `400 Bad Request` y no se modifica nada.
- **Escenario de fallo (Intento de cambiar el email):**
  - Si el body incluye `email`, devuelve `400 Bad Request`: el email es el identificador de inicio de sesión y no se puede modificar en esta etapa.
- **Escenario de fallo (Contraseña actual incorrecta):**
  - Si `currentPassword` no coincide con la contraseña del `Owner`, devuelve `400 Bad Request` y no se cambia nada.
- **Escenario de fallo (Contraseña nueva inválida):**
  - Si `newPassword` tiene menos de 8 caracteres o es igual a la actual, devuelve `400 Bad Request`.

### Reglas de Negocio
- Un `Owner` solo puede modificar **su propia cuenta**. Los endpoints no reciben `idOwner` en la URL: operan siempre sobre `request.user` (ruta `/owner/me/`), así que no existe forma de apuntar a la cuenta de otra persona.
- Campos editables del perfil: `firstName`, `lastName`, `phone`. No son editables `idOwner`, `email`, `isDeleted`, `created_at` ni `password` (esta última solo por el endpoint específico).
- `phone` es opcional: enviar `null` o cadena vacía lo borra. Si se envía, solo admite dígitos, espacios, `+`, `-` y paréntesis, entre 6 y 20 caracteres.
- Contraseña: mínimo 8 caracteres, máximo 128, **distingue mayúsculas y minúsculas**, y la nueva debe ser distinta de la actual.
- Al cambiar la contraseña se **reemplaza el token**: el token anterior deja de valer (también en otros dispositivos con la sesión abierta) y el cliente debe guardar el nuevo.
- `PUT` queda deshabilitado; se usa `PATCH`.
- **"Olvidé mi contraseña" (recuperación sin sesión) queda fuera de este sprint:** requiere enviar un email con un enlace o código, y la verificación de email está pospuesta al próximo sprint. Este TDD cubre solo el cambio de contraseña con la sesión iniciada.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Owner` y autenticación (TDD-0000 y TDD-0001):** Modelo `Owner`, token de DRF y `request.user`.


### Estimación
- **Estimación total:** **5 Story Points** (Escala Fibonacci).
- **Desglose:**
  - `PATCH /api/v1/owner/me/`, serializer de actualización, bloqueo del email y tests: *1 SP*
  - `POST /api/v1/owner/me/password/`, validación de la contraseña actual, reemplazo del token y tests: *1 SP*
  - Pantallas Expo "Editar perfil" y "Cambiar contraseña", y reemplazo del token guardado: *3 SP*

---

## Diseño Técnico (RFC)


### Contrato de API (Django REST Framework ↔ Expo Mobile)

#### Modificar perfil

- **Endpoint:** `PATCH /api/v1/owner/me/`
- **Autenticación:** Requiere `Authorization: Token <token>` (`IsAuthenticated`).
- **Content-Type:** `application/json`

##### Request Body (al menos un campo)

```json
{
  "firstName": "Valentina",
  "lastName": "García López",
  "phone": "+54 221 555 0123"
}
```

##### Response Body (`200 OK`)

```json
{
  "idOwner": 1,
  "firstName": "Valentina",
  "lastName": "García López",
  "email": "valentina@email.com",
  "phone": "+54 221 555 0123",
  "isDeleted": false,
  "created_at": "2026-10-04T10:45:00Z"
}
```

#### Cambiar contraseña

- **Endpoint:** `POST /api/v1/owner/me/password/`
- **Autenticación:** Requiere `Authorization: Token <token>` (`IsAuthenticated`).
- **Content-Type:** `application/json`

##### Request Body (JSON)

```json
{
  "currentPassword": "MiClave2026",
  "newPassword": "OtraClave2027"
}
```

##### Response Body (`200 OK`)

```json
{
  "token": "b3f1c8a2d7e94f6a8c0b5d2e1f9a7c3d4e6b8a10"
}
```

##### Response Body (`400 Bad Request`, ejemplo)

```json
{
  "currentPassword": ["La contraseña actual es incorrecta."]
}
```

Un error de contraseña actual incorrecta devuelve `400` y **no** `401`, porque el cliente trata cualquier `401` como "sesión vencida" y cierra la sesión.

### Código de referencia

```python
# Backend/api/views.py
class OwnerViewSet(viewsets.GenericViewSet):
    http_method_names = ["post", "patch", "delete"] 

    def get_permissions(self):
        return [AllowAny()] if self.action == "create" else [IsAuthenticated()]

    @action(detail=False, methods=["patch", "delete"], url_path="me")
    def me(self, request):
        ... 

    @action(detail=False, methods=["post"], url_path="me/password")
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        owner = request.user
        with transaction.atomic():
            owner.set_password(serializer.validated_data["newPassword"])
            owner.save(update_fields=["password", "updated_at"])
            Token.objects.filter(user=owner).delete()      
            token = Token.objects.create(user=owner)   
        return Response({"token": token.key})
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo)**:
   - **Editar perfil:** la pantalla carga los datos del `owner` que la app ya tiene en el estado (recibidos en el registro o el login) y envía `PATCH /api/v1/owner/me/` solo con los campos modificados. Al recibir `200`, actualiza el estado local.
   - **Cambiar contraseña:** pide contraseña actual, nueva y confirmación (la coincidencia la valida el cliente). Envía `POST /api/v1/owner/me/password/`. Al recibir `200`, **reemplaza el token guardado en `expo-secure-store`** por el nuevo.
2. **Servidor (Django REST Framework)**:
   - `OwnerViewSet` toma siempre `request.user` como instancia; no busca por id.
   - `OwnerSerializer` (actualización parcial): reutiliza las validaciones del TDD-0000 para `firstName` y `lastName`, valida `phone`, y en `validate` rechaza con `400` si llega `email`.
   - `ChangePasswordSerializer`: comprueba `currentPassword` con `owner.check_password()`, aplica `validate_password()` a `newPassword` (mínimo 8) y exige que sea distinta de la actual.
   - El cambio de contraseña, la eliminación del token anterior y la creación del nuevo ocurren en una sola transacción.
3. **Persistencia / Relaciones**:
   - Ninguna relación cambia: el `idOwner` es el mismo, por lo que las mascotas y el resto de los datos siguen asociados.
4. **Respuesta**:
   - Perfil: `200 OK` con el `Owner` actualizado. Contraseña: `200 OK` con el token nuevo.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Cambio de nombre** | Se envía solo `firstName` válido. El resto no cambia. | `200 OK` |
| **Cambio de varios campos** | `firstName`, `lastName` y `phone` válidos. | `200 OK` |
| **Agregar teléfono** | `phone` válido en una cuenta que lo tenía en `null`. | `200 OK` |
| **Borrar teléfono** | `phone` enviado como `null` o `""`. Queda `null`. | `200 OK` |
| **Mismos datos actuales** | Se envían los mismos valores que ya tiene. Se acepta. | `200 OK` |
| **Sin sesión** | Petición sin token o con token inválido. | `401 Unauthorized` |
| **Nombre o apellido vacío** | Vacío o solo con espacios. | `400 Bad Request` |
| **Nombre demasiado largo** | Más de 100 caracteres. | `400 Bad Request` |
| **Teléfono inválido** | `"abc"`, 3 dígitos, o más de 20 caracteres. | `400 Bad Request` |
| **Intento de cambiar el email** | El body incluye `email`. | `400 Bad Request` |
| **Campos protegidos en el body** | Se envía `idOwner` o `isDeleted`. Se ignoran y no se modifican. | `200 OK` |
| **Body vacío** | `{}`. No hay nada que modificar. | `400 Bad Request` |
| **Modificar la cuenta de otro** | No es posible: la ruta `/owner/me/` siempre opera sobre `request.user`. | `200 OK` (solo sobre la propia) |
| **PUT** | Se usa `PUT` en lugar de `PATCH`. | `405 Method Not Allowed` |
| **Cambio de contraseña correcto** | Contraseña actual correcta y nueva válida. Devuelve token nuevo. | `200 OK` |
| **Token anterior tras el cambio** | Una petición con el token viejo. | `401 Unauthorized` |
| **Login con la contraseña vieja tras el cambio** | Se rechaza (TDD-0001). | `401 Unauthorized` |
| **Login con la contraseña nueva tras el cambio** | Entra. | `200 OK` |
| **Contraseña actual incorrecta** | `currentPassword` errónea (incluye diferencias de mayúsculas). | `400 Bad Request` |
| **Contraseña nueva corta** | `newPassword` de 7 caracteres. | `400 Bad Request` |
| **Contraseña nueva igual a la actual** | `newPassword == currentPassword`. | `400 Bad Request` |
| **Faltan campos de la contraseña** | Falta `currentPassword` o `newPassword`. | `400 Bad Request` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. Si falla la transacción, el token y la contraseña anteriores se conservan. | `500 Internal Server Error` |

---


## Plan de Implementación

1. **Etapa 1 - Serializers (Backend):**
   - Completar `OwnerSerializer` para actualización parcial, con la validación de `phone` y el rechazo de `email`.
   - Crear `ChangePasswordSerializer` en `Backend/api/serializers.py`.
2. **Etapa 2 - Endpoints (Backend):**
   - Habilitar `PATCH /api/v1/owner/me/` y `POST /api/v1/owner/me/password/` en `OwnerViewSet` (`IsAuthenticated`), con el reemplazo del token en una transacción y sin `PUT`.
3. **Etapa 3 - Integración Móvil (Frontend Expo):**
   - Implementar ambas funciones de consumo HTTP en `Frontend/src/services/api.ts`.
   - Desarrollar las pantallas "Editar perfil" y "Cambiar contraseña", y actualizar el token en `expo-secure-store` tras el cambio.
4. **Etapa 4 - Tests:**
   - Tests de cada caso de la tabla, verificando en la base que el token anterior se elimina y que el nuevo funciona.
