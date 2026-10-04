---
id: 0015
estado: Por implementar
autor: Matías Cortés
fecha: 02-10-2026
titulo: Baja Lógica de Medicamento en Catálogo
---

# TDD-0015: Baja Lógica de Medicamento en Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Si un medicamento fue cargado por error o se discontinuó, debe poder retirarse del catálogo sin perder la integridad referencial de los historiales clínicos pasados.
- **Resultado esperado:** Deshabilitar un medicamento marcándolo como eliminado (`isDeleted = true`), de modo que no vuelva a aparecer en los selectores de nuevos tratamientos.

### User Persona
- **Dueño / Tutor (`Owner`) / Usuario de la App:** Usuario que desea ocultar o retirar un medicamento del catálogo.

### User Story
**Como** usuario de la app, **quiero** dar de baja un medicamento del catálogo, **para que** no vuelva a figurar entre las opciones seleccionables para nuevos tratamientos.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Al solicitar la baja de un medicamento activo (`isDeleted = false`), el sistema cambia su flag a `isDeleted = true`.
- **Escenario de fallo (Medicamento no encontrado):**
  - Si el `id` no existe, el sistema retorna `404 Not Found`.
- **Escenario de fallo (Medicamento ya dado de baja):**
  - Si se intenta dar de baja un medicamento que ya posee `isDeleted = true`, el sistema devuelve `404 Not Found`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **TDD-0013 (Alta de Medicamento):** Campo `isDeleted` configurado por defecto en `False`.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Acción `destroy()` soft-delete en ViewSet: *1 SP*
  - Confirmación modal y actualización en interfaz: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `DELETE /api/v1/medications/{id}/`
- **Path Parameter:** `id`

#### Response Body (200 OK)

```json
{
  "message": "El medicamento fue dado de baja correctamente del catálogo.",
  "id": 10,
  "isDeleted": true
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go):** El usuario presiona el botón de eliminar medicamento y confirma la acción en un modal emergente. La app móvil realiza una solicitud `DELETE /api/v1/medications/{id}/`.
2. **Servidor (Django REST Framework):**
   - `MedicationViewSet` intercepta la acción de borrado en el método `destroy()` o `perform_destroy()`.
   - Busca el medicamento en la base de datos verificando que exista y esté activo (`id=pk`, `isDeleted=False`). Si no existe o ya está borrado, devuelve `404 Not Found`.
   - Si lo encuentra, no realiza un borrado físico; en su lugar, asigna `medication.isDeleted = True` y guarda la instancia.
3. **Respuesta:** El servidor devuelve `200 OK` junto con el mensaje de éxito; el cliente actualiza el estado removiendo visualmente el medicamento del catálogo de opciones.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **ID Inexistente** | Petición `DELETE` sobre un `id` que no existe en la base de datos. | `404 Not Found` |
| **Medicamento ya eliminado** | Petición `DELETE` sobre un registro cuyo flag `isDeleted` ya es `true`. | `404 Not Found` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - ViewSet (Backend):**
   - Sobrescribir `perform_destroy()` o `destroy()` en `MedicationViewSet` para aplicar el Soft Delete (`isDeleted = True`).
2. **Etapa 2 - Frontend (Expo Mobile):**
   - Conectar el botón de eliminación con un diálogo de confirmación y refrescar la lista.