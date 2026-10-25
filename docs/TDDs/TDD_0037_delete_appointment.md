---
id: 0037
estado: Por implementar
autor: Matias Yael Cortes
fecha: 24-10-2026
titulo: Baja Lógica de Turno Veterinario
---

# TDD-0037: Baja Lógica de Turno Veterinario

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Cuando un turno se cancela definitivamente o fue creado por error, el usuario debe poder darlo de baja para que no continúe ocupando espacio visual ni confunda su agenda médica, manteniendo el registro en la base de datos para auditoría.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de un registro de turno (`Appointment`) mediante el endpoint `DELETE`.

### User Persona
- **Dueño de mascota (Owner):** Usuario que cancela una cita médica que no se va a realizar.

### User Story
**Como** dueño de una mascota, **quiero** dar de baja un turno cancelado, **para que** mi lista de turnos refleje únicamente las visitas médicas vigentes.

### Criterios de Aceptación
- **Escenario de éxito (Baja lógica exitosa):**
  - Si el turno existe, pertenece a una mascota del usuario y no está eliminado (`isDeleted = false`), el sistema marca `isDeleted = true` y devuelve `204 No Content`.
- **Escenario de fallo (Turno inexistente o ajeno):**
  - Si el `id` en la URL no existe o pertenece a una mascota de otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Turno ya eliminado):**
  - Si el turno ya tiene `isDeleted = true`, devuelve `404 Not Found`.

### Reglas de Negocio
- La eliminación es estrictamente un borrado lógico (`isDeleted = true`) para conservar la trazabilidad histórica de la mascota.
- Al dar de baja un turno se libera la fecha y hora para que el usuario pueda volver a agendar en ese slot si lo desea.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Appointment` (TDD-0034):** Existencia del registro y del campo `isDeleted`.
2. **Autenticación (TDD-0001):** Validación de permisos de propiedad.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - Método `destroy` en `AppointmentViewSet`: *0.5 SP*
  - Diálogo nativo de confirmación y feedback visual en app móvil: *0.5 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `DELETE /api/v1/appointments/{id}/`
- **Response Body (`204 No Content`):** Respuesta sin contenido que confirma la baja lógica.

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja lógica exitosa** | Registro propio activo pasa a `isDeleted = true`. | `204 No Content` |
| **ID Inexistente** | Petición sobre un ID no registrado. | `404 Not Found` |
| **Turno de otro usuario** | Petición sobre turno de mascota ajena. | `404 Not Found` |
| **Turno ya eliminado** | Petición sobre turno con `isDeleted = true`. | `404 Not Found` |

