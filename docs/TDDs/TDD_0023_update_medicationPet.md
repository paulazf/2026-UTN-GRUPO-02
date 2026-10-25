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
- **Problema que resuelve:** Si el veterinario ajusta la pauta de un tratamiento (cambiando la frecuencia horaria o la cantidad de dosis por toma) o se requiere actualizar las notas clínicas o corregir la fecha de inicio, el usuario debe poder modificar el registro sin necesidad de recrearlo, recalculando de forma automática la fecha de finalización (`endDate`).
- **Resultado esperado:** Permitir la actualización parcial (`PATCH`) o total (`PUT`) de un tratamiento farmacológico activo (`MedicationPet`), recalculando coherentemente `endDate` ante modificaciones en `startDate`, `frequencyHours` o `quantityDose`.

### User Persona
- **Dueño de mascota (Owner):** Usuario que necesita actualizar las indicaciones de un tratamiento farmacológico según nuevas directrices veterinarias.

### User Story
**Como** dueño de una mascota, **quiero** modificar la frecuencia, dosis, fecha de inicio u observaciones de un tratamiento, **para que** el registro refleje fielmente las indicaciones del veterinario y recalcule automáticamente la fecha de fin y estado.

### Criterios de Aceptación
- **Escenario de éxito (Modificación exitosa con recálculo de endDate):**
  - Si el registro existe, pertenece a una mascota del usuario, no está eliminado y los nuevos datos respetan las reglas de validación (frecuencia y dosis > 0, fecha no futura), el sistema actualiza el registro, recalcula `endDate` y devuelve `200 OK`.
- **Escenario de fallo (Datos inválidos):**
  - Si se envían valores de frecuencia o dosis menores o iguales a cero, o fecha futura, el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Cambio de mascota o medicamento):**
  - Si se intenta modificar el `idPet` o `idMedication` del registro, el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Registro inexistente, ajeno o eliminado):**
  - Si el ID no existe, está dado de baja (`isDeleted = true`) o pertenece a una mascota de otro usuario, el sistema devuelve `404 Not Found`.

### Reglas de Negocio
- La frecuencia (`frequencyHours`) y la cantidad de dosis (`quantityDose`) deben ser estrictamente mayores a cero.
- La mascota vinculada o el medicamento base no pueden reasignarse arbitrariamente mediante una edición; solo se actualizan los parámetros del tratamiento.
- Si se modifica cualquiera de los valores `startDate`, `frequencyHours` o `quantityDose`, el sistema vuelve a calcular `endDate` mediante `calculate_medication_end_date`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `MedicationPet` (TDD-0021):** Existencia de los registros previos y cálculo de `endDate`.
2. **Autenticación (TDD-0001):** Validación de permisos de propiedad.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Lógica de actualización, recálculo de `endDate` y validación en serializer: *1 SP*
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
  "quantityDose": 4,
  "notes": "Ajuste de dosis a 4 tomas totales indicado por el veterinario."
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
  "quantityDose": 4,
  "startDate": "2026-10-25",
  "endDate": "2026-10-26",
  "status": "En tratamiento",
  "notes": "Ajuste de dosis a 4 tomas totales indicado por el veterinario.",
  "isDeleted": false
}
```

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Actualización exitosa con recálculo de endDate** | Modificar `quantityDose = 4` recalcula `endDate` automáticamente. | `200 OK` |
| **Frecuencia o dosis <= 0** | Valores inválidos menores o iguales a cero. | `400 Bad Request` |
| **Intento de reasignar mascota o medicamento** | Envío de `idPet` o `idMedication` diferente al original. | `400 Bad Request` |
| **ID Inexistente** | El ID del tratamiento no se encuentra en base de datos. | `404 Not Found` |
| **Registro de otro usuario** | El tratamiento pertenece a una mascota ajena. | `404 Not Found` |
| **Registro dado de baja** | Intento de editar un registro con `isDeleted = true`. | `404 Not Found` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica en Serializer / ViewSet (Backend):** Soporte de `update` / `partial_update` recalculando `endDate`.
2. **Etapa 2 - Modal de edición en Frontend Móvil:** Actualización de los campos y visualización reactiva del cambio de fecha de fin.
