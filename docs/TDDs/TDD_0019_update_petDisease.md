---
id: 0019
estado: Por implementar
autor: Paula Zacarías
fecha: 07-10-2026
titulo: Modificación de Enfermedad en Mascota
---

# TDD-0019: Modificación de Enfermedad en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Cuando una mascota se recupera de una enfermedad que estaba registrada como activa/en curso, el dueño necesita registrar la fecha de alta médica (`endDate`). Asimismo, pueden ocurrir equivocaciones al ingresar las fechas de inicio, o el usuario puede necesitar agregar/actualizar observaciones clínicas (`notes`) a medida que avanza el tratamiento.
- **Resultado esperado:** Permitir la actualización parcial (`PATCH`) o total (`PUT`) de un registro de enfermedad de una mascota (`PetDisease`), posibilitando asentar la fecha de cierre del cuadro clínico, corregir fechas o editar las notas/observaciones.

### User Persona
- **Dueño de mascota (Owner):** Usuario que necesita dar de alta un cuadro clínico cuando su mascota se curó, actualizar notas de seguimiento médico o corregir datos de una patología registrada.

### User Story
**Como** dueño de una mascota, **quiero** actualizar el registro de una enfermedad de mi mascota para indicar la fecha de alta, corregir fechas o agregar observaciones, **para que** su historial clínico se mantenga fidedigno y al día.

### Criterios de Aceptación
- **Escenario de éxito (Asentar alta médica / fecha de fin):**
  - Si el registro existe, pertenece a una mascota activa del usuario y se envía un `endDate` válido posterior o igual a `startDate`, el sistema actualiza el registro guardando la fecha de fin y devuelve `200 OK`.
- **Escenario de éxito (Actualizar notas u observaciones):**
  - Si se actualiza únicamente el campo `notes` (o junto con las fechas), el sistema persiste el nuevo texto de observaciones y devuelve `200 OK`.
- **Escenario de éxito (Corrección de fechas):**
  - Si se actualiza `startDate` y/o `endDate` manteniendo la consistencia cronológica (`startDate <= today` y `endDate >= startDate`), el sistema guarda los cambios y devuelve `200 OK`.
- **Escenario de fallo (Fechas inconsistentes):**
  - Si se intenta asignar un `endDate` anterior a `startDate` o un `startDate` futuro, devuelve `400 Bad Request`.
- **Escenario de fallo (Registro inexistente o eliminado):**
  - Si el `id` especificado en la URL no existe, está marcado como dado de baja (`isDeleted = true`) o pertenece a una mascota de otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Colisión de activo duplicado):**
  - Si al editar se intenta quitar el `endDate` (dejándola activa) cuando ya existe otro registro activo de la misma enfermedad para la mascota, el sistema devuelve `409 Conflict`.

### Reglas de Negocio
- La fecha de fin (`endDate`) nunca puede ser anterior a la fecha de inicio (`startDate`).
- La fecha de inicio (`startDate`) no puede ser posterior a la fecha actual (`today`).
- El campo `notes` es opcional y puede ser modificado libremente.
- La mascota vinculada (`pet`) no puede ser reasignada a otra mascota en una modificación; solo se permite editar las fechas, notas o la enfermedad diagnosticada.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `PetDisease` (TDD-0017):** Debe existir la estructura de persistencia y el registro previo.
2. **Autenticación (TDD-0001):** Validación de permisos de propiedad sobre la mascota.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Lógica de actualización y validación en serializer con soporte de `notes`: *1 SP*
  - Modal de edición en pestaña "Enfermedades" del frontend móvil: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `PUT /api/v1/pet-diseases/{id}/` o `PATCH /api/v1/pet-diseases/{id}/`
- **Content-Type:** `application/json`

#### Request Body (PATCH)

```json
{
  "endDate": "2026-08-20",
  "notes": "Recuperación completa tras completar tratamiento con gotas óticas. Sin secreciones."
}
```

#### Response Body (`200 OK`)

```json
{
  "id": 12,
  "idPet": 1,
  "petName": "Milo",
  "idDisease": 5,
  "diseaseName": "Otitis Externa",
  "startDate": "2026-08-01",
  "endDate": "2026-08-20",
  "notes": "Recuperación completa tras completar tratamiento con gotas óticas. Sin secreciones.",
  "isDeleted": false
}
```

---

## Arquitectura y Flujo (Cliente-Servidor / Expo Mobile)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - En la pestaña "Enfermedades" del perfil de la mascota, cada tarjeta incluye un botón "Editar".
   - Al pulsar "Editar", se abre el modal pre-cargado con las fechas actuales y el texto existente en `notes`.
   - El usuario puede actualizar las notas de seguimiento médico o ajustar fechas, y guardar los cambios (`PUT` o `PATCH`).
2. **Servidor (Django REST Framework)**:
   - `PetDiseaseViewSet`: busca el registro activo del usuario por clave primaria. Si no existe, lanza `404 Not Found`.
   - `PetDiseaseSerializer`: valida la coherencia entre `startDate` y `endDate`, y actualiza `notes`.
   - Aplica los cambios en la base de datos PostgreSQL.
3. **Respuesta**:
   - Devuelve `200 OK`. El cliente actualiza la tarjeta correspondiente en el listado de la pestaña "Enfermedades".

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Actualización de fecha y notas** | Registro activo recibe nuevo `endDate` y `notes`. | `200 OK` |
| **Actualización solo de notas** | Se modifica únicamente el texto de `notes`. | `200 OK` |
| **Fecha de fin anterior a inicio** | `endDate` menor a `startDate`. | `400 Bad Request` |
| **Fecha de inicio futura** | Modificación de `startDate` con valor posterior a hoy. | `400 Bad Request` |
| **ID Inexistente** | El `id` de `PetDisease` no existe en base de datos. | `404 Not Found` |
| **Registro de otro usuario** | El registro pertenece a una mascota de otro dueño. | `404 Not Found` |
| **Registro dado de baja** | Registro con `isDeleted = true`. | `404 Not Found` |
| **Colisión por activación** | Se remueve `endDate` cuando ya existe otra activa de la misma enfermedad. | `409 Conflict` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica en Serializer y ViewSet (Backend):**
   - Habilitar métodos `update` y `partial_update` en `PetDiseaseViewSet` contemplando `notes` y validaciones cruzadas de fechas.
2. **Etapa 2 - Integración en Frontend Móvil:**
   - Crear función `updatePetDisease` en `Frontend/src/services/api.ts`.
   - Agregar modal de edición con soporte para editar `notes` en el componente de tarjeta de enfermedad.
