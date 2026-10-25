---
id: 0031
estado: Por implementar
autor: Thiago Perez
fecha: 21-10-2026
titulo: Eliminación de Vacuna en Mascota
---

# TDD-0031: Eliminación de Vacuna en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El dueño necesita quitar aplicaciones cargadas por error o duplicadas, para que no generen avisos de vencimiento falsos.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de un `VaccinePet`. Deja de aparecer en la pestaña Vacunas, en los contadores del Inicio y en el cálculo de renovadas.

### User Persona
- **Dueño de mascota (Owner):** Usuario que mantiene ordenada la libreta sanitaria de su mascota.

### User Story
**Como** dueño de una mascota, **quiero** eliminar una vacuna o pipeta que registré por error, **para que** no me lleguen avisos que no corresponden.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si la aplicación existe, está activa y es de una mascota del usuario, el sistema establece `isDeleted = true` y devuelve `204 No Content`.
- **Escenario de éxito (Efecto en renovadas):**
  - Si se elimina la aplicación más reciente de un producto, la anterior deja de estar `RENEWED` y vuelve a mostrar su estado real.
- **Escenario de fallo (Registro no encontrado o ya eliminado):**
  - Si el `idVaccinePet` no existe, ya fue dado de baja o es de una mascota ajena, devuelve `404 Not Found`.

### Reglas de Negocio
- La baja es lógica, igual que en `MedicationPet` y `MedicalTest`.
- La baja de una aplicación no afecta al catálogo ni a las demás aplicaciones de la mascota.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `VaccinePet` (TDD-0028)** con el flag `isDeleted`.
2. **Consulta (TDD-0029):** `get_queryset()` filtrado por dueño; la anotación `hasNewer` ya filtra `isDeleted = False`.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - `perform_destroy` con soft delete y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `DELETE /api/v1/vaccine-pets/{idVaccinePet}/`

#### Response Body (`204 No Content`)
- *Respuesta vacía al completarse la baja lógica.*

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - "Eliminar" en la tarjeta pide confirmación ("¿Eliminar Antirrábica, 3ª dosis?") con `Alert.alert`.
   - Envía `DELETE` y, con `204`, recarga la lista.
2. **Servidor (Django REST Framework)**:
   - Obtiene la aplicación con el `get_queryset()` de TDD-0029; si no está, `404`.
   - `perform_destroy()`:
     ```python
     def perform_destroy(self, instance):
         instance.isDeleted = True
         instance.save(update_fields=["isDeleted", "updated_at"])
     ```
3. **Respuesta**:
   - `204 No Content`.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja correcta** | Queda `isDeleted = true` en la base. | `204 No Content` |
| **Listado tras la baja** | `GET ?idPet=` no la incluye. | `200 OK` (excluida) |
| **Contadores tras la baja** | Una vencida eliminada deja de contar en `?status=EXPIRED`. | `200 OK` |
| **Baja de la última dosis** | La dosis anterior vuelve de `RENEWED` a su estado real. | `204 No Content` |
| **Detalle o edición tras la baja** | `GET` o `PATCH` del registro eliminado. | `404 Not Found` |
| **ID inexistente o ya eliminado** | | `404 Not Found` |
| **Aplicación de mascota ajena** | El registro no cambia. | `404 Not Found` |
| **Sin autenticación** | | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Sobrescribir Borrado en ViewSet:**
   - Sobrescribir `perform_destroy` en `VaccinePetViewSet` para marcar `isDeleted = True`.
2. **Etapa 2 - Tests:**
   - Un test por cada fila de la tabla, incluyendo el caso de la dosis anterior que deja de estar renovada.
