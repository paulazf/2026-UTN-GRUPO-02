---
id: 0023
estado: Implementado
autor: Matias Yael Cortes
fecha: 08-10-2026
titulo: Modificación de Medicamento en Mascota
---

# TDD-0023: Modificación de Medicamento en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Si el veterinario ajusta la pauta de un tratamiento (cambiando la frecuencia horaria o la cantidad de dosis por toma) o se requiere actualizar las notas clínicas, el usuario debe poder modificar el registro sin necesidad de recrearlo.
- **Resultado esperado:** Permitir la actualización parcial (`PATCH`) o total (`PUT`) de un tratamiento farmacológico activo (`MedicationPet`).

### User Persona
- **Dueño de mascota (Owner):** Usuario que necesita actualizar las indicaciones de un tratamiento farmacológico vigente según nuevas directrices veterinarias.

### User Story
**Como** dueño de una mascota, **quiero** modificar la frecuencia, dosis u observaciones de un tratamiento activo, **para que** el registro refleje fielmente las indicaciones actuales del veterinario.

### Criterios de Aceptación
- **Escenario de éxito (Modificación exitosa):**
  - Si el registro existe, pertenece a una mascota del usuario, no está eliminado y los nuevos datos respetan las reglas de validación (frecuencia y dosis > 0), el sistema actualiza el registro y devuelve `200 OK`.
- **Escenario de fallo (Datos inválidos):**
  - Si se envían valores de frecuencia o dosis menores o iguales a cero, el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Registro inexistente, ajeno o eliminado):**
  - Si el ID no existe, está dado de baja (`isDeleted = true`) o pertenece a una mascota de otro usuario, el sistema devuelve `404 Not Found`.

### Reglas de Negocio
- La frecuencia (`frequencyHours`) y la cantidad de dosis (`quantityDose`) deben ser estrictamente mayores a cero.
- La mascota vinculada o el medicamento base no pueden reasignarse arbitrariamente mediante una edición simple; solo se actualizan los parámetros del tratamiento.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `MedicationPet` (TDD-0021):** Existencia de los registros previos.
2. **Autenticación (TDD-0001):** Validación de permisos de propiedad.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Lógica de actualización y validación en serializer: *1 SP*
  - Modal de edición en frontend móvil: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoints:** `PUT /api/v1/medication-pets/{id}/` o `PATCH /api/v1/medication-pets/{id}/`
- **Content-Type:** `application/json`

#### Request Body (PATCH)

```json
{
  "frequencyHours": 8,
  "quantityDose": 2,
  "notes": "Ajuste de pauta indicado por el veterinario en control periódico."
}
```

#### Response Body (`200 OK`)

```json
{
  "id": 1,
  "idPet": 1,
  "petName": "Milo",
  "idMedication": 4,
  "medicationName": "Cefalexina",
  "frequencyHours": 8,
  "quantityDose": 2,
  "startDate": "2026-10-05",
  "notes": "Ajuste de pauta indicado por el veterinario en control periódico.",
  "isDeleted": false
}
```

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Actualización exitosa** | Registro activo recibe nueva frecuencia, dosis u observaciones. | `200 OK` |
| **Frecuencia o dosis <= 0** | Valores inválidos menores o iguales a cero. | `400 Bad Request` |
| **ID Inexistente** | El ID del tratamiento no se encuentra en base de datos. | `404 Not Found` |
| **Registro de otro usuario** | El tratamiento pertenece a una mascota ajena. | `404 Not Found` |
| **Registro dado de baja** | Intento de editar un registro con `isDeleted = true`. | `404 Not Found` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica en Serializer y ViewSet (Backend):** Habilitar métodos de actualización con validación de rangos.
2. **Etapa 2 - Integración en Frontend Móvil:** Crear función `updateMedicationPet` y agregar modal de edición en la app.