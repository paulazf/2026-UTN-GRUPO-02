---
id: 0008
estado: Por implementar
autor: Paula Zacarías
fecha: 01-10-2026
titulo: Modificación de Enfermedad
---

# TDD-0008: Modificación de Enfermedad

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Corregir errores ortográficos, fe de erratas o actualizar la denominación oficial de una enfermedad registrada previamente en el catálogo sin afectar las relaciones existentes con las historias clínicas de las mascotas.
- **Resultado esperado:** Permitir actualizar el nombre (`name`) de un registro `Disease` existente mediante su identificador `idDisease`.

### User Persona
- **Administrador de Sistema / Precarga:** Usuario encargado del mantenimiento del catálogo que requiere corregir o actualizar la información de una enfermedad.

### User Story
**Como** administrador del sistema, **quiero** modificar el nombre de una enfermedad existente, **para que** el catálogo mantenga información precisa sin romper los registros clínicos asociados.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si la enfermedad existe, está activa (`isDeleted = false`) y el nuevo nombre no colisiona con otra enfermedad registrada (case-insensitive), el sistema actualiza el registro y conserva la relación con `PetDisease`.
- **Escenario de fallo (Registro no encontrado):**
  - Si el `idDisease` no existe o corresponde a un registro dado de baja lógica (`isDeleted = true`), el sistema devuelve `404 Not Found`.
- **Escenario de fallo (Conflicto de nombre duplicado):**
  - Si el nuevo nombre coincide (case-insensitive) con el nombre de **otra** enfermedad activa en el catálogo, el sistema rechaza la edición y devuelve `409 Conflict`.
- **Escenario de fallo (Datos inválidos):**
  - Si se intenta actualizar enviando un `name` vacío o compuesto únicamente por espacios, devuelve `400 Bad Request`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Disease` (TDD-0007):** Debe existir el modelo `Disease` y la estructura de base de datos base.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Ajustes de serializador para actualización parcial (`PUT`/`PATCH`): *1 SP*
  - Lógica de validación de nombres duplicados al editar y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `PUT /api/v1/diseases/{idDisease}/` (o `PATCH /api/v1/diseases/{idDisease}/`)
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Rabia Canina"
}
```

#### Response Body (`200 OK`)

```json
{
  "idDisease": 1,
  "name": "Rabia Canina",
  "isDeleted": false
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin App / API Client)**:
   - Envía `PUT /api/v1/diseases/{idDisease}/` especificando el ID en la URL y el nuevo nombre en el body.
2. **Servidor (Django REST Framework)**:
   - `DiseaseViewSet`: Busca el objeto por `idDisease` filtrando que `isDeleted == False`. Si no existe, lanza `404 Not Found`.
   - `DiseaseSerializer`: En la edición, valida que el nuevo `name` no pertenezca a otra entidad distinta (`idDisease != instance.idDisease`) comparando de forma case-insensitive.
   - Guarda los cambios en la base de datos PostgreSQL.
3. **Persistencia / Relaciones**:
   - Como la tabla `PetDisease` hace referencia a `idDisease` como clave foránea, las asociaciones previas se mantienen intactas y reflejan automáticamente la nueva denominación.
4. **Respuesta**:
   - Devuelve `200 OK` con los datos actualizados.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **ID Inexistente** | El `idDisease` especificado en la URL no existe en la base de datos. | `404 Not Found` |
| **Modificación de Eliminado** | El `idDisease` pertenece a una enfermedad dada de baja lógica (`isDeleted = true`). | `404 Not Found` |
| **Nombre vacío** | El campo `name` se envía vacío o solo con espacios. | `400 Bad Request` |
| **Colisión con otra enfermedad** | El nuevo nombre coincide con el nombre de otra enfermedad activa distinta. | `409 Conflict` |
| **Mismo nombre actual** | Si se envía el mismo nombre que la entidad ya posee, la validación permite la operación sin lanzar colisión con ella misma. | `200 OK` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |


---

## Plan de Implementación

1. **Etapa 1 - Lógica en Serializer:**
   - Actualizar `DiseaseSerializer` para considerar el ID de la instancia en la validación de unicidad case-insensitive (`exclude(pk=instance.pk)`).
2. **Etapa 2 - Endpoints de Actualización:**
   - Habilitar los métodos `update` y `partial_update` en `DiseaseViewSet`.