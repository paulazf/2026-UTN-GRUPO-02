---
id: 0027
estado: Por implementar
autor: Thiago Perez
fecha: 21-10-2026
titulo: Eliminación de Vacuna del Catálogo
---

# TDD-0027: Eliminación de Vacuna del Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Retirar del catálogo productos que ya no se usan o se cargaron por error, sin perder el historial de las mascotas que los recibieron.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de un `Vaccine`. El producto deja de aparecer en el selector, pero las aplicaciones ya registradas lo siguen mostrando.

### User Persona
- **Administrador de Sistema / Precarga:** Usuario encargado de mantener el catálogo activo.

### User Story
**Como** administrador del sistema, **quiero** dar de baja un producto del catálogo, **para que** no se pueda elegir en nuevas aplicaciones, manteniendo el historial de las mascotas que ya lo recibieron.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el producto existe y está activo, el sistema establece `isDeleted = true` y devuelve `204 No Content`, tenga o no aplicaciones asociadas.
- **Escenario de fallo (Registro no encontrado o ya eliminado):**
  - Si el `idVaccine` no existe o ya fue dado de baja, devuelve `404 Not Found`.
- **Escenario de fallo (Autenticación):**
  - Sin autenticación devuelve `401 Unauthorized`.

### Reglas de Negocio
- La FK de `VaccinePet` a `Vaccine` es `on_delete=PROTECT`: un borrado físico con aplicaciones asociadas queda bloqueado, por eso la baja es siempre lógica.
- Un producto dado de baja no se puede usar en nuevas altas de `VaccinePet` (TDD-0028 devuelve `404`), pero sigue apareciendo con su nombre en las aplicaciones existentes.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Vaccine` (TDD-0025):** Debe contar con el flag `isDeleted`.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - `perform_destroy` con soft delete y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `DELETE /api/v1/vaccines/{idVaccine}/`

#### Response Body (`204 No Content`)
- *Respuesta vacía al completarse la baja lógica.*

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin / Postman)**:
   - Ejecuta `DELETE /api/v1/vaccines/{idVaccine}/`.
2. **Servidor (Django REST Framework)**:
   - `VaccineViewSet` obtiene la instancia activa; si no está, `404`.
   - `perform_destroy()`:
     ```python
     def perform_destroy(self, instance):
         instance.isDeleted = True
         instance.save(update_fields=["isDeleted", "updated_at"])
     ```
   - El listado `GET /api/v1/vaccines/` filtra `isDeleted = False`, así que el producto deja de aparecer en el selector.
3. **Respuesta**:
   - Devuelve `204 No Content`.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja correcta** | Producto activo sin aplicaciones. Queda `isDeleted = true`. | `204 No Content` |
| **Baja con aplicaciones** | Producto usado en `VaccinePet`. Las aplicaciones siguen mostrando `vaccineName`. | `204 No Content` |
| **Listado tras la baja** | `GET /api/v1/vaccines/` no lo incluye. | `200 OK` (excluido) |
| **Alta de aplicación con producto dado de baja** | `POST /api/v1/vaccine-pets/` con ese `idVaccine`. | `404 Not Found` |
| **ID Inexistente** | `idVaccine` que no existe. | `404 Not Found` |
| **Producto ya eliminado** | `isDeleted = true`. | `404 Not Found` |
| **Sin autenticación** | Petición sin token. | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Sobrescribir Borrado en ViewSet:**
   - Sobrescribir `perform_destroy` en `VaccineViewSet` para marcar `isDeleted = True`.
2. **Etapa 2 - Tests:**
   - Un test por cada fila de la tabla, incluyendo que el producto siga visible en una aplicación existente.
