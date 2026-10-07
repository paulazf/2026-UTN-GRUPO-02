---
id: 0016
estado: Por implementar
autor: Matías Cortés
fecha: 05-10-2026
titulo: Baja Lógica de Medicamento en Catálogo
---

# TDD-0016: Baja Lógica de Medicamento en Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Inactivar medicamentos del catálogo general para que no se puedan seleccionar en nuevos registros de salud, resguardando la integridad referencial y el historial clínico de las mascotas que los hayan consumido previamente.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de un medicamento mediante una operación administrativa.

### User Persona
- **Administrador de Sistema / Precarga:** Usuario encargado de deshabilitar medicamentos discontinuados o erróneos del catálogo activo.

### User Story
**Como** administrador del sistema, **quiero** dar de baja un medicamento del catálogo, **para que** no pueda ser seleccionado en nuevas anotaciones clínicas, manteniendo intacto el registro de las mascotas que ya lo tienen cargado.

### Criterios de Aceptación
- **Escenario de éxito (Baja lógica):**
  - Si el medicamento existe, el sistema establece `isDeleted = true` en la tabla `Medication`. Al ser una baja lógica, cualquier asociación futura que ya exista en las historias clínicas de las mascotas conserva su integridad referencial.
- **Escenario de fallo (Registro no encontrado o ya eliminado):**
  - Si el `idMedication` no existe o ya fue dado de baja previamente, el sistema devuelve `404 Not Found`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **TDD-0014 (Alta de Medicamento):** Campo `isDeleted` configurado por defecto en `False`.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - Acción `destroy()` soft-delete en ViewSet de `Medication`: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `DELETE /api/v1/medications/{idMedication}/`
- **Path Parameter:** `idMedication`

#### Response Body (204 No Content)
- *Respuesta vacía al completarse el soft delete.*

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin App / Script / Postman):** 
   - Ejecuta `DELETE /api/v1/medications/{idMedication}/`.
2. **Servidor (Django REST Framework):**
   - `MedicationViewSet.destroy()`: Obtiene la instancia activa (`isDeleted == False`).
   - Efectúa la baja lógica cambiando el flag de estado (`instance.isDeleted = True`) y guarda la entidad.
   - El catálogo de consultas públicas filtrará automáticamente `isDeleted = False`, impidiendo que el medicamento sea elegido para nuevos registros, pero las claves foráneas históricas seguirán apuntando al ID original válido.
3. **Respuesta:** 
   - Devuelve HTTP `204 No Content`.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **ID Inexistente** | Petición `DELETE` sobre un `idMedication` que no existe en DB. | `404 Not Found` |
| **Medicamento ya eliminado** | Petición `DELETE` sobre un registro cuyo flag `isDeleted` ya es `true`. | `404 Not Found` |
| **Falla de Persistencia** | Error interno de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Sobrescribir Borrado en ViewSet:**
   - Sobrescribir el método `destroy` o `perform_destroy` en `MedicationViewSet` para aplicar el Soft Delete (`isDeleted = True`).