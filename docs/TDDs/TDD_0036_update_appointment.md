---
id: 0036
estado: Por implementar
autor: Matias Yael Cortes
fecha: 24-10-2026
titulo: Modificación de Turno Veterinario
---

# TDD-0036: Modificación de Turno Veterinario

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Las citas veterinarias frecuentemente requieren ser reprogramadas por motivos de agenda o cambio de consultorio. El tutor debe poder modificar los datos del turno sin tener que cancelarlo y crearlo desde cero.
- **Resultado esperado:** Permitir la actualización parcial (`PATCH`) o total (`PUT`) de un turno activo (`Appointment`), modificando su fecha (`date`), hora (`time`), veterinario (`veterinarian`), motivo (`description`) o reasignando su domicilio (`idAddress`).

### User Persona
- **Dueño de mascota (Owner):** Usuario que necesita cambiar la fecha, hora, lugar o descripción de una cita programada.

### User Story
**Como** dueño de una mascota, **quiero** modificar los datos de un turno agendado, **para que** la cita médica refleje la fecha, hora y lugar correctos ante cualquier reprogramación.

### Criterios de Aceptación
- **Escenario de éxito (Modificación exitosa):**
  - Si el turno existe, pertenece a una mascota del usuario autenticado, no está eliminado y los nuevos datos son válidos, el sistema actualiza el registro y devuelve `200 OK`.
- **Escenario de fallo (Intento de cambiar de mascota):**
  - Si se intenta modificar el `idPet`, el sistema devuelve `400 Bad Request` (el turno no puede transferirse de animal).
- **Escenario de fallo (Colisión horaria):**
  - Si la nueva fecha y hora coinciden con otro turno activo de la misma mascota, devuelve `409 Conflict`.
- **Escenario de fallo (Turno inexistente o ajeno):**
  - Si el `id` en la URL no existe, pertenece a otro dueño o tiene `isDeleted = true`, devuelve `404 Not Found`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Appointment` (TDD-0034):** Existencia del registro previo.
2. **Entidad `Address` (TDD-0033):** Posibilidad de reasignar otro domicilio del usuario.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Validación de campos inmutables y exclusión en control de colisión: *1 SP*
  - Modal de edición con precarga en frontend: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoints:** `PATCH /api/v1/appointments/{id}/` o `PUT /api/v1/appointments/{id}/`

#### Request Body (PATCH)
```json
{
  "date": "2026-11-22",
  "time": "18:00:00",
  "idAddress": 4,
  "description": "Reprogramado para ecografía de control"
}
```

#### Response Body (`200 OK`)
```json
{
  "id": 1,
  "idPet": 1,
  "petName": "Milo",
  "description": "Reprogramado para ecografía de control",
  "veterinarian": "Dra. Silvina Gómez",
  "date": "2026-11-22",
  "time": "18:00:00",
  "idAddress": 4,
  "isDeleted": false
}
```

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Reprogramación exitosa** | Modifica fecha y hora sin solapamiento. | `200 OK` |
| **Cambio de domicilio** | Asocia un nuevo `idAddress` válido del usuario. | `200 OK` |
| **Intento de reasignar mascota** | Intento de enviar otro `idPet`. | `400 Bad Request` |
| **Colisión horaria** | Coincide con otro turno activo de la misma mascota. | `409 Conflict` |
| **Turno inexistente o ajeno** | ID no encontrado o de otro usuario. | `404 Not Found` |

