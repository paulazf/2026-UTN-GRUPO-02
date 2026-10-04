---
id: 0013
estado: Por implementar
autor: Thiago Perez
fecha: 03-10-2026
titulo: Eliminación de Estudio Médico
---

# TDD-0013: Eliminación de Estudio Médico

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El dueño necesita quitar de la historia clínica de su mascota estudios cargados por error, duplicados o que ya no quiere ver.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de un `MedicalTest`, para que deje de aparecer en la pestaña "Estudios" y en el "Historial" sin borrar físicamente el registro ni el archivo.

### User Persona
- **Dueño de mascota (Owner):** Usuario que quiere mantener ordenada la lista de estudios de su mascota.

### User Story
**Como** dueño de una mascota, **quiero** eliminar un estudio de su historia clínica, **para que** solo queden los estudios que me sirven.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el estudio existe, está activo y pertenece a una mascota del usuario autenticado, el sistema establece `isDeleted = true` y devuelve `204 No Content`.
  - Desde ese momento el estudio no aparece en los listados (TDD-0011) ni se puede consultar, modificar ni volver a eliminar.
- **Escenario de fallo (Registro no encontrado o ya eliminado):**
  - Si el `idMedicalTest` no existe, ya fue dado de baja o pertenece a una mascota de otro usuario, devuelve `404 Not Found`.

### Reglas de Negocio
- La baja es **lógica**: el registro y el archivo se conservan en el almacenamiento, en línea con el resto de las entidades del sistema (ver TDD-0009). Esto permite recuperar un estudio borrado por error a nivel administrativo.
- La baja de un estudio no afecta a la mascota ni a sus demás estudios.
- Se pueden eliminar estudios en cualquier estado, incluidos los pendientes.
- La FK de `MedicalTest` a `Pet` es `on_delete=PROTECT`: un borrado físico de la mascota con estudios asociados queda bloqueado, por lo que la baja de mascotas también debe ser lógica.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `MedicalTest` (TDD-0010):** Debe contar con el flag `isDeleted`.
2. **Consulta de estudios (TDD-0011):** `get_queryset()` filtrado por dueño, `isDeleted` y mascota activa.
3. **Mockup (Figma):** Hoy no hay acción para eliminar un estudio (ver "Ajustes al mockup").

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - `perform_destroy` con soft delete en `MedicalTestViewSet` y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `DELETE /api/v1/medical-test/{idMedicalTest}/`

#### Response Body (`204 No Content`)
- *Respuesta vacía al completarse la baja lógica.*

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - El usuario toca "Eliminar" en la tarjeta expandida del estudio y confirma en un diálogo ("¿Eliminar el estudio Hemograma completo?").
   - Envía `DELETE /api/v1/medical-test/{idMedicalTest}/` y, al recibir `204`, lo quita de la lista, actualiza el contador ("3 estudios") y el aviso de pendientes si correspondía.
2. **Servidor (Django REST Framework)**:
   - `MedicalTestViewSet` obtiene el estudio con el `get_queryset()` de TDD-0011. Si no está, responde `404 Not Found`.
   - `perform_destroy()` hace la baja lógica en lugar del borrado físico:
     ```python
     def perform_destroy(self, instance):
         instance.isDeleted = True
         instance.save(update_fields=["isDeleted"])
     ```
   - Como el filtro `isDeleted = False` está en `get_queryset()`, el estudio deja de aparecer en cualquier `GET`.
3. **Respuesta**:
   - Devuelve `204 No Content`.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja correcta** | Estudio activo y propio. En la base queda `isDeleted = true` y el archivo sigue en disco. | `204 No Content` |
| **Baja de estudio pendiente** | Estudio con `status = pending`. Deja de aparecer en `GET ?status=pending`. | `204 No Content` |
| **ID Inexistente** | `DELETE` sobre un `idMedicalTest` que no existe. | `404 Not Found` |
| **Estudio ya eliminado** | `DELETE` sobre un estudio con `isDeleted = true`. | `404 Not Found` |
| **Estudio de otro dueño** | `DELETE` sobre un estudio de una mascota de otro usuario. El registro no cambia. | `404 Not Found` |
| **Listado tras la baja** | `GET /api/v1/medical-test/?idPet={id}` no incluye el estudio eliminado. | `200 OK` (excluido) |
| **Historial tras la baja** | `GET /api/v1/medical-test/` no incluye el estudio eliminado. | `200 OK` (excluido) |
| **Detalle o modificación tras la baja** | `GET` o `PATCH` sobre el estudio eliminado. | `404 Not Found` |
| **Otros estudios de la mascota** | Los demás estudios de la misma mascota siguen activos y visibles. | `200 OK` |
| **Sin autenticación** | Petición sin credenciales. | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Ajustes al mockup (Figma)
- No hay forma de eliminar un estudio. Se propone un botón **"Eliminar"** en la tarjeta expandida (o dentro de "Editar estudio") con diálogo de confirmación.

---

## Plan de Implementación

1. **Etapa 1 - Sobrescribir Borrado en ViewSet:**
   - Sobrescribir `perform_destroy` en `MedicalTestViewSet` para marcar `isDeleted = True` y guardar solo ese campo.
2. **Etapa 2 - Tests:**
   - Tests de cada caso de la tabla, verificando en la base que el registro sigue existiendo con `isDeleted = true` y en disco que el archivo no se borró.