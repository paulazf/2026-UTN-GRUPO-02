---
id: 0014
estado: Por implementar
autor: Matías Cortés
fecha: 02-10-2026
titulo: Actualización de Medicamento en Catálogo
---

# TDD-0014: Actualización de Medicamento en Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Un medicamento guardado en el catálogo puede requerir correcciones en su nombre comercial, ajustes en su dosis o actualizar la descripción (laboratorio, componentes).
- **Resultado esperado:** Permitir la edición de un medicamento activo (`isDeleted = false`) en el catálogo general.

### User Persona
- **Dueño / Tutor (`Owner`) / Usuario de la App:** Usuario que detecta un error en un medicamento del catálogo o necesita agregar más detalles a su descripción.

### User Story
**Como** usuario de la app, **quiero** modificar la información de un medicamento existente en el catálogo, **para que** los datos reflejen la dosis y descripción correctas.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el usuario modifica los campos permitidos (`name`, `dose`, `description`), el sistema actualiza la entidad `Medication`.
- **Escenario de fallo (Medicamento inexistente o eliminado):**
  - Si se intenta editar un `id` de medicamento inexistente o con `isDeleted = true`, el sistema devuelve `404 Not Found`.
- **Escenario de fallo (Campos requeridos vacíos):**
  - Si se envía un `PUT` dejando campos requeridos vacíos o con dosis <= 0, el sistema rechaza la operación con `400 Bad Request`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **TDD-0013 (Alta de Medicamento):** Modelo `Medication` creado y migrado.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Lógica de actualización en Serializer y ViewSet: *1 SP*
  - Pantalla `EditMedicationScreen` en Expo: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `PUT /api/v1/medications/{id}/`
- **Path Parameter:** `id` (ID del medicamento)
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Amoxidal Duo Forte",
  "dose": 750.000,
  "description": "Amoxicilina + Ácido Clavulánico. Dosis alta."
}
```

#### Response Body (200 OK)

```json
{
  "id": 10,
  "name": "Amoxidal Duo Forte",
  "dose": "750.000",
  "description": "Amoxicilina + Ácido Clavulánico. Dosis alta.",
  "isDeleted": false,
  "updated_at": "2026-10-02T11:00:00Z"
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go):** La pantalla de edición carga los datos actuales del medicamento en el formulario. El usuario los modifica y envía un `PUT /api/v1/medications/{id}/`.
2. **Servidor (Django REST Framework):**
   - `MedicationViewSet` busca el medicamento activo (`id=pk`, `isDeleted=False`). Si no existe o ya está dado de baja, retorna `404 Not Found`.
   - `MedicationSerializer` valida los datos modificados (campos requeridos, dosis válida y no duplicidad de nombre/dosis con otro ID diferente).
   - En el método `update()`, se persisten los cambios directamente en la tabla unificada `Medication`.
3. **Respuesta:** El servidor devuelve `200 OK` con el objeto serializado del medicamento actualizado; el cliente muestra un mensaje de confirmación y refresca la vista del catálogo.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **ID Inexistente** | El `id` especificado en la URL no existe en la base de datos. | `404 Not Found` |
| **Modificación de Eliminado** | El `id` pertenece a un medicamento dado de baja lógica (`isDeleted = true`). | `404 Not Found` |
| **Datos obligatorios vacíos** | El campo `name` o `dose` se envía vacío o solo con espacios. | `400 Bad Request` |
| **Dosis inválida** | El campo `dose` es menor o igual a `0`. | `400 Bad Request` |
| **Colisión de medicamento duplicado** | Los nuevos datos coinciden con el `name` y `dose` de *otro* medicamento activo distinto. | `409 Conflict` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Rutas (Backend):**
   - Habilitar `PUT` / `PATCH` en `MedicationViewSet` filtrando siempre por `isDeleted = False`.
2. **Etapa 2 - Frontend (Expo Mobile):**
   - Desarrollar la pantalla de edición y su conexión al servicio API cargando previamente los datos existentes.