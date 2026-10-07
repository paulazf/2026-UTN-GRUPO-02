---
id: 0015
estado: Por implementar
autor: Matías Cortés
fecha: 05-10-2026
titulo: Actualización de Medicamento en Catálogo
---

# TDD-0015: Actualización de Medicamento en Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Corregir errores ortográficos, ajustar dosis o actualizar la descripción de un medicamento registrado previamente en el catálogo sin afectar los historiales médicos de las mascotas que ya lo tienen asociado.
- **Resultado esperado:** Permitir la edición de un medicamento activo (`isDeleted = false`) en el catálogo general mediante una operación administrativa.

### User Persona
- **Administrador de Sistema / Precarga:** Usuario encargado del mantenimiento del catálogo que requiere corregir o actualizar la información de un medicamento.

### User Story
**Como** administrador del sistema, **quiero** modificar la información de un medicamento existente en el catálogo, **para que** los datos reflejen la información correcta sin romper los registros personales de las mascotas.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el medicamento existe y los nuevos datos no colisionan (combinación nombre case-insensitive + dosis) con otro registro distinto, el sistema actualiza la entidad.
- **Escenario de fallo (Registro no encontrado):**
  - Si el `idMedication` no existe o está dado de baja (`isDeleted = true`), el sistema devuelve `404 Not Found`.
- **Escenario de fallo (Conflicto de duplicidad):**
  - Si la nueva combinación de nombre y dosis choca con **otro** medicamento activo distinto, el sistema devuelve `409 Conflict`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **TDD-0014 (Alta de Medicamento):** Modelo `Medication` creado.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Ajustes de serializador para actualización y unicidad en edición: *1 SP*
  - Endpoints `PUT / PATCH` en ViewSet: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `PUT /api/v1/medications/{idMedication}/`
- **Path Parameter:** `idMedication`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Amoxidal Duo Forte",
  "dose": 750.000,
  "description": "Dosis alta."
}
```

#### Response Body (200 OK)

```json
{
  "idMedication": 10,
  "name": "Amoxidal Duo Forte",
  "dose": "750.000",
  "description": "Dosis alta.",
  "isDeleted": false,
  "updated_at": "2026-10-05T11:00:00Z"
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin App / API Client):** 
   - Envía un `PUT /api/v1/medications/{idMedication}/` especificando el ID en la URL y los datos en el body.
2. **Servidor (Django REST Framework):**
   - `MedicationViewSet` busca el medicamento activo (`isDeleted=False`). Si no existe, retorna `404 Not Found`.
   - `MedicationSerializer` valida los datos (campos requeridos, dosis > 0) y asegura que la nueva combinación de `Lower(name)` + `dose` no pertenezca a otra entidad distinta (`exclude(pk=instance.pk)`).
   - Guarda los cambios en PostgreSQL.
3. **Respuesta:** 
   - Devuelve `200 OK` con los datos actualizados.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **ID Inexistente** | El `idMedication` de la URL no existe en la base de datos. | `404 Not Found` |
| **Modificación de Eliminado** | El ID pertenece a un medicamento con `isDeleted = true`. | `404 Not Found` |
| **Datos obligatorios vacíos** | El campo `name` o `dose` se envía vacío o solo con espacios. | `400 Bad Request` |
| **Colisión con otro registro** | Los nuevos datos coinciden con nombre (case-insensitive) y dosis de otro registro activo. | `409 Conflict` |
| **Mismo dato actual** | Si se envían los mismos datos que ya posee, la validación lo permite. | `200 OK` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica en Serializer:**
   - Actualizar `MedicationSerializer` para considerar el ID de la instancia en la validación de unicidad.
2. **Etapa 2 - Endpoints de Actualización:**
   - Habilitar `update` y `partial_update` en `MedicationViewSet`.