---
id: 0012
estado: Por implementar
autor: Thiago Perez
fecha: 03-10-2026
titulo: Modificación de Estudio Médico
---

# TDD-0012: Modificación de Estudio Médico

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Hay dos situaciones habituales:
  1. El estudio se cargó como **pendiente** y días después llega el resultado: hay que pasarlo a Normal o Alterado, cargar el resultado y adjuntar el archivo.
  2. El dueño se equivocó al cargarlo: nombre, tipo, fecha o veterinario mal, o adjuntó el archivo equivocado.
- **Resultado esperado:** Permitir modificar cualquier dato de un `MedicalTest` existente y reemplazar o agregar su archivo, manteniendo su asociación con la mascota.

### User Persona
- **Dueño de mascota (Owner):** Usuario que necesita completar o corregir un estudio que ya cargó.

### User Story
**Como** dueño de una mascota, **quiero** completar el resultado de un estudio pendiente o corregir uno que cargué mal, **para que** la historia clínica de mi mascota tenga la información correcta.

### Criterios de Aceptación
- **Escenario de éxito (Completar pendiente):**
  - Si el estudio está en `status = pending` y se envía `status = normal` o `altered` junto con `resultSummary` (y opcionalmente `resultDetail` y `file`), el sistema actualiza el registro y devuelve `200 OK`. El estudio deja de aparecer en el aviso "Resultado pendiente".
- **Escenario de éxito (Corrección):**
  - Si el estudio existe, está activo, pertenece a una mascota del usuario autenticado y los datos son válidos, el sistema actualiza solo los campos enviados y devuelve `200 OK`.
  - Si se envía un nuevo `file`, el archivo anterior (si había) se elimina del almacenamiento una vez confirmada la actualización.
- **Escenario de fallo (Registro no encontrado):**
  - Si el `idMedicalTest` no existe, está dado de baja o pertenece a una mascota de otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Datos inválidos):**
  - Se aplican las mismas validaciones de campo que en el alta (TDD-0010): `name` vacío, `type` / `status` inválidos, `date` futura, archivo con formato o tamaño no permitido. Devuelve `400 Bad Request` y no modifica nada.
- **Escenario de fallo (Resultado faltante):**
  - Si después de aplicar los cambios el estudio queda con `status` `normal` o `altered` y sin `resultSummary`, devuelve `400 Bad Request`.
- **Escenario de fallo (Cambio de mascota):**
  - No se permite mover un estudio a otra mascota. Si el body incluye `idPet`, devuelve `400 Bad Request`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `MedicalTest` (TDD-0010):** Modelo, serializer, configuración de media y validaciones definidos.
2. **Consulta de estudios (TDD-0011):** `get_queryset()` filtrado por dueño, `isDeleted` y mascota activa.
3. **Mockup (Figma):** Hoy no hay pantalla ni acción para editar un estudio (ver "Ajustes al mockup").

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - `partial_update`, bloqueo de `idPet` y validación del resultado sobre el estado final: *1 SP*
  - Reemplazo de archivo con borrado del anterior y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `PATCH /api/v1/medical-test/{idMedicalTest}/`
- **Content-Type:** `multipart/form-data` (si se adjunta archivo) o `application/json`

Se usa `PATCH` (actualización parcial) porque lo habitual es cambiar pocos campos. `PUT` queda deshabilitado para no obligar a reenviar el archivo.

#### Request Body (al menos un campo)

Cualquiera de: `name`, `type`, `date`, `veterinarian`, `status`, `resultSummary`, `resultDetail`, `file`. Mismas reglas que en TDD-0010.

Ejemplo: completar un estudio pendiente (`multipart/form-data`):

| Campo | Valor |
| --- | --- |
| `status` | `normal` |
| `resultSummary` | `Sin alteraciones` |
| `resultDetail` | `Densidad 1.030, pH 6.5, sin sedimento patológico.` |
| `file` | `orina_luna.pdf` |

#### Response Body (`200 OK`)

```json
{
  "idMedicalTest": 7,
  "idPet": 1,
  "petName": "Luna",
  "name": "Análisis de orina",
  "type": "laboratory",
  "date": "2026-09-10",
  "veterinarian": "Dra. Ríos",
  "status": "normal",
  "resultSummary": "Sin alteraciones",
  "resultDetail": "Densidad 1.030, pH 6.5, sin sedimento patológico.",
  "file": "http://192.168.0.13:8000/media/medical_tests/pet_1/orina_luna.pdf",
  "isDeleted": false
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - Desde la tarjeta del estudio (o desde el aviso "Resultado pendiente"), el usuario toca "Editar" / "Cargar resultado" y se abre el mismo bottom sheet del alta con los datos precargados.
   - Envía `PATCH /api/v1/medical-test/{idMedicalTest}/` solo con los campos que cambiaron.
2. **Servidor (Django REST Framework)**:
   - `MedicalTestViewSet` obtiene el estudio con el `get_queryset()` de TDD-0011. Si no está, responde `404 Not Found`.
   - `MedicalTestSerializer`:
     - Reutiliza `validate_name`, `validate_date` y `validate_file` de TDD-0010.
     - En `validate`, si `self.instance` existe y llega `idPet`, lanza error de validación (`400`).
     - En `validate`, calcula el estado final combinando la instancia con los datos enviados (`attrs.get("status", instance.status)`, idem `resultSummary`) y aplica la regla de resultado obligatorio.
     - En `update`, si llega un `file` nuevo y había uno anterior, con `transaction.on_commit` borra el anterior del almacenamiento (`old_file.delete(save=False)`) recién cuando la base confirmó el cambio.
3. **Persistencia / Relaciones**:
   - La FK a `Pet` no cambia, así que el estudio sigue en la historia clínica de la misma mascota.
4. **Respuesta**:
   - Devuelve `200 OK` con los datos actualizados.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Completar pendiente** | Estudio `pending`; se envía `status = normal`, `resultSummary` y `file`. | `200 OK` |
| **Completar pendiente sin resultado** | Estudio `pending`; se envía solo `status = altered`. | `400 Bad Request` |
| **Volver a pendiente** | Estudio `normal`; se envía `status = pending`. Se permite (p. ej. se repite el estudio). | `200 OK` |
| **Cambio de nombre** | Se envía solo `name` válido. El resto no cambia. | `200 OK` |
| **Cambio de tipo o fecha** | `type = imaging` o `date` pasada válida. | `200 OK` |
| **Agregar archivo** | Estudio sin archivo; se envía `file`. | `200 OK` |
| **Reemplazo de archivo** | Estudio con archivo; se envía otro. El nuevo queda guardado y el anterior se borra del disco. | `200 OK` |
| **Mismo nombre actual** | Se envía el mismo `name`. Se acepta sin error. | `200 OK` |
| **ID Inexistente** | El `idMedicalTest` de la URL no existe. | `404 Not Found` |
| **Modificación de eliminado** | El estudio tiene `isDeleted = true`. | `404 Not Found` |
| **Estudio de otro dueño** | El estudio pertenece a una mascota de otro usuario. | `404 Not Found` |
| **Nombre vacío** | `name` vacío o solo con espacios. | `400 Bad Request` |
| **Valores inválidos** | `type`, `status` o `date` inválidos, o `date` futura. | `400 Bad Request` |
| **Borrar resultado con estado Normal** | Estudio `normal`; se envía `resultSummary = ""`. | `400 Bad Request` |
| **Archivo inválido** | Formato no permitido o más de 10 MB. El archivo anterior se conserva. | `400 Bad Request` |
| **Intento de cambiar mascota** | El body incluye `idPet`. | `400 Bad Request` |
| **PUT** | Se usa `PUT` en lugar de `PATCH`. | `405 Method Not Allowed` |
| **Sin autenticación** | Petición sin credenciales. | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. El archivo anterior **no** se borra porque la transacción no se confirmó. | `500 Internal Server Error` |

---

## Ajustes al mockup (Figma)
- No hay forma de editar un estudio ni de cargar el resultado de uno pendiente. Se propone:
  - Botón **"Editar"** en la tarjeta expandida, junto a "Ver PDF" y "Compartir", que abra "Subir estudio" en modo edición (título "Editar estudio", datos precargados).
  - Que el aviso **"Resultado pendiente"** sea tocable y abra el mismo formulario para cargar el resultado.

---

## Plan de Implementación

1. **Etapa 1 - Lógica en Serializer:**
   - En `MedicalTestSerializer.validate`, rechazar `idPet` en edición y aplicar la regla de resultado obligatorio sobre el estado final.
   - Sobrescribir `update` para borrar el archivo anterior con `transaction.on_commit` cuando se reemplaza.
2. **Etapa 2 - Endpoint de Actualización:**
   - Habilitar `partial_update` en `MedicalTestViewSet` y excluir `PUT` (`http_method_names` sin `put`).
3. **Etapa 3 - Tests:**
   - Tests de cada caso de la tabla, verificando también en disco que el archivo anterior se borra al reemplazar y se conserva cuando la validación falla.