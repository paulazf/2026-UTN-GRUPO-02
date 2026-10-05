---
id: 0003
estado: Por implementar
autor: Martina Lopez
fecha: 04-10-2026
titulo: Eliminación de Owner
---

# TDD-0003: Eliminación de Owner

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El dueño necesita poder dar de baja su cuenta cuando ya no quiere usar la app. Como `Pet.owner` y el resto de las relaciones usan `on_delete=PROTECT`, un borrado físico del `Owner` con mascotas asociadas fallaría y dejaría datos huérfanos.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) del `Owner` autenticado y cerrar su sesión. La cuenta deja de poder iniciar sesión y el email queda libre para registrar una cuenta nueva. Quien se registre de nuevo empieza de cero.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario con sesión iniciada que decide dejar de usar la app y eliminar su cuenta.

### User Story
**Como** dueño de una mascota, **quiero** eliminar mi cuenta, **para que** deje de existir mi acceso a la app y, si vuelvo, pueda crear una cuenta nueva desde cero.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el `Owner` autenticado confirma la eliminación, el sistema establece `isDeleted = true`, elimina su token de autenticación y devuelve `204 No Content`.
  - Desde ese momento no puede iniciar sesión ni usar su token (TDD-0001), y su email puede usarse para registrar una cuenta nueva (TDD-0000).
- **Escenario de fallo (Sin sesión):**
  - Si la petición no incluye un token válido (incluye una cuenta ya dada de baja), devuelve `401 Unauthorized`.

### Reglas de Negocio
- La baja es **lógica**: no se ejecuta `DELETE` en SQL sobre la tabla `owner`. Es consistente con el resto de las entidades (ver TDD-0009 y TDD-0013) y evita romper las FK con `PROTECT`.
- Un `Owner` solo puede eliminar **su propia cuenta**. El endpoint no recibe `idOwner`: opera sobre `request.user` (ruta `/owner/me/`).
- No puede haber dos cuentas activas con el mismo email, pero sí una activa y varias dadas de baja. La restricción única del TDD-0000 solo aplica a `isDeleted = false`, por eso eliminar la cuenta libera el email.
- La cuenta nueva **no hereda nada** de la anterior: es otro `Owner` con otro `idOwner`.
- Los datos de la cuenta eliminada (mascotas, estudios, etc.) **no se modifican ni se borran**. Quedan en la base, pero nadie puede acceder a ellos: no existe ninguna cuenta que pueda autenticarse como ese `Owner`.
- La baja de la cuenta no se puede deshacer desde la app. Recuperarla es una tarea administrativa en la base de datos.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Owner` con `isDeleted` (TDD-0000):** Incluye la restricción única condicional y `is_active` basado en `isDeleted`.
2. **Autenticación (TDD-0001):** El token y `IsAuthenticated`.
3. **Mockup (Figma):** Hoy no hay acción para eliminar la cuenta (ver "Ajustes al mockup").

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Acción `DELETE /api/v1/owner/me/` con baja lógica y eliminación del token, y tests: *1 SP*
  - Opción "Eliminar cuenta" con diálogo de confirmación y limpieza de la sesión en Expo: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `DELETE /api/v1/owner/me/`
- **Autenticación:** Requiere `Authorization: Token <token>` (`IsAuthenticated`).
- **Request Body:** No requiere body.

#### Response Body (`204 No Content`)
- *Respuesta vacía al completarse la baja lógica.*

### Código de referencia

```python
def destroy_me(self, request):
    owner = request.user
    with transaction.atomic():
        owner.isDeleted = True
        owner.save(update_fields=["isDeleted", "updated_at"])
        Token.objects.filter(user=owner).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo)**:
   - El usuario toca "Eliminar cuenta" en su perfil y confirma en un diálogo que explica que no podrá recuperarla y que, si vuelve, empieza de cero.
   - Envía `DELETE /api/v1/owner/me/`. Al recibir `204`, borra el token de `expo-secure-store` y los datos locales, y vuelve a la pantalla de bienvenida.
2. **Servidor (Django REST Framework)**:
   - `OwnerViewSet` toma `request.user` como instancia.
   - En una sola transacción marca `isDeleted = true` y elimina el token del `Owner`.
   - Como `is_active` devuelve `not isDeleted`, cualquier token que hubiera quedado se rechaza con `401` y `authenticate()` no encuentra la cuenta en el login.
3. **Persistencia / Relaciones**:
   - Las filas de `Pet` y demás tablas asociadas conservan su FK hacia `idOwner` intacta.
4. **Respuesta**:
   - Devuelve `204 No Content`.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja correcta** | Owner autenticado. Queda `isDeleted = true` y su token se elimina. | `204 No Content` |
| **Token tras la baja** | Una petición con el token anterior. | `401 Unauthorized` |
| **Login tras la baja** | Con el email y la contraseña de la cuenta eliminada. | `401 Unauthorized` |
| **Registro con el email de la cuenta eliminada** | `POST /api/v1/owner/` con el mismo email. Se crea una cuenta nueva con otro `idOwner`. | `201 Created` |
| **Login con el email reutilizado** | Solo entra con la contraseña de la cuenta nueva. | `200 OK` |
| **La cuenta nueva no ve datos de la anterior** | `GET /api/v1/pets/` de la cuenta nueva devuelve una lista vacía. | `200 OK` |
| **Datos conservados** | En la base, las mascotas de la cuenta eliminada siguen existiendo. | — |
| **Eliminar sin sesión** | Petición sin token. | `401 Unauthorized` |
| **Eliminar dos veces** | Segundo `DELETE` con el mismo token (ya eliminado). | `401 Unauthorized` |
| **Eliminar la cuenta de otro** | No es posible: la ruta `/owner/me/` siempre opera sobre `request.user`. | `204 No Content` (solo sobre la propia) |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. Si falla la transacción, la cuenta y el token se conservan. | `500 Internal Server Error` |

---

## Ajustes al mockup (Figma)
- No hay forma de eliminar la cuenta. Se propone un botón **"Eliminar cuenta"** en "Mi perfil" (ver TDD-0002), con diálogo de confirmación.

---

## Plan de Implementación

1. **Etapa 1 - Baja lógica (Backend):**
   - Implementar la rama `DELETE` de la acción `me` en `OwnerViewSet` (`Backend/api/views.py`): `isDeleted = True` y eliminación del token en una transacción.
2. **Etapa 2 - Integración Móvil (Frontend Expo):**
   - Implementar `DELETE /api/v1/owner/me/` en `Frontend/src/services/api.ts`.
   - Agregar la opción con diálogo de confirmación y la limpieza de sesión local.
3. **Etapa 3 - Tests:**
   - Tests de cada caso de la tabla, incluido el registro con el email reutilizado y la verificación en la base de que el registro sigue existiendo con `isDeleted = true`.
