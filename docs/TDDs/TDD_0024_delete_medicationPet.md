---
id: 0024
estado: Implementado
autor: Matias Yael Cortes
fecha: 08-10-2026
titulo: Baja Lógica de Medicamento en Mascota
---

# TDD-0024: Baja Lógica de Medicamento en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Cuando un tratamiento farmacológico finaliza o fue cargado por error, el usuario debe poder retirarlo del perfil activo de la mascota mediante una baja lógica para preservar el historial y la trazabilidad de la historia clínica.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de un registro de tratamiento farmacológico (`MedicationPet`) mediante una petición `DELETE`, ocultándolo de las consultas normales de la aplicación.

### User Persona
- **Dueño de mascota (Owner):** Usuario que necesita dar de baja un tratamiento concluido para mantener el perfil al día.

### User Story
**Como** dueño de una mascota, **quiero** dar de baja un tratamiento que ya concluyó, **para que** la lista de medicación activa de mi mascota quede limpia y actualizada.

### Criterios de Aceptación
- **Escenario de éxito (Baja lógica exitosa):**
  - Si el registro existe, pertenece a una mascota activa del usuario y no está eliminado (`isDeleted = false`), el sistema actualiza el flag a `isDeleted = true` y devuelve `204 No Content`.
- **Escenario de fallo (Registro no encontrado o ajeno):**
  - Si el `id` especificado en la URL no existe o pertenece a una mascota de otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Registro ya eliminado):**
  - Si el registro ya fue dado de baja previamente (`isDeleted = true`), el sistema devuelve `404 Not Found`.

### Reglas de Negocio
- La eliminación es estrictamente un borrado lógico (`isDeleted = true`). El registro físico no se elimina de la tabla `medication_pet` para mantener auditoría.
- No se permite eliminar registros pertenecientes a mascotas ajenas.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `MedicationPet` (TDD-0021):** Atributo booleano `isDeleted`.
2. **Autenticación (TDD-0001):** Verificación de propiedad del recurso.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - Método `destroy` en `MedicationPetViewSet`: *0.5 SP*
  - Modal de confirmación y feedback visual en app móvil: *0.5 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)
- **Endpoint:** `DELETE /api/v1/medication-pets/{id}/`
- **Response Body (`204 No Content`):** Respuesta sin contenido al completarse la baja lógica.

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja lógica exitosa** | Registro propio activo pasa a `isDeleted = True`. | `204 No Content` |
| **ID Inexistente** | Petición `DELETE` sobre un ID no registrado. | `404 Not Found` |
| **Registro de otro usuario** | Petición sobre registro de mascota ajena. | `404 Not Found` |
| **Registro ya eliminado** | Petición sobre un registro cuyo `isDeleted` ya es `true`. | `404 Not Found` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Sobrescribir Borrado en ViewSet (Backend):** Implementar el método `destroy` aplicando soft delete.
2. **Etapa 2 - Integración en Frontend Móvil:** Crear función `deleteMedicationPet` y agregar diálogo de confirmación en la app.