---
id: 0009
estado: Por implementar
autor: Paula Zacarías
fecha: 01-10-2026
titulo: Eliminación de Enfermedad
---

# TDD-0009: Eliminación de Enfermedad

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Inactivar enfermedades del catálogo general para que no se puedan seleccionar en nuevos registros clínicos, resguardando la integridad referencial y el historial de las mascotas que la hayan contraído previamente.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de una enfermedad. Si la enfermedad está en uso activo en la historia clínica de alguna mascota (`PetDisease`), se garantiza la protección relacional mediante `PROTECT`.

### User Persona
- **Administrador de Sistema / Precarga:** Usuario encargado de deshabilitar enfermedades en desuso o erróneas del catálogo activo.

### User Story
**Como** administrador del sistema, **quiero** dar de baja una enfermedad del catálogo, **para que** no pueda ser seleccionada en nuevos diagnósticos, manteniendo el historial de las mascotas que ya la padecieron.

### Criterios de Aceptación
- **Escenario de éxito (Baja lógica sin conflictos):**
  - Si la enfermedad existe y no está asociada a ningún registro activo en `PetDisease`, el sistema establece `isDeleted = true` en la tabla `Disease`.
- **Escenario de éxito con historial (Protección de referencias):**
  - Si la enfermedad se encuentra asociada a uno o más registros en `PetDisease`, dado que la clave foránea está configurada con `on_delete=models.PROTECT`, la baja del registro base no compromete el historial de la mascota. El sistema realiza el soft delete marcando `isDeleted = true` para ocultarla de la selección de nuevas altas, preservando los datos históricos existentes.
- **Escenario de fallo (Registro no encontrado o ya eliminado):**
  - Si el `idDisease` no existe o ya fue dado de baja previamente (`isDeleted = true`), el sistema devuelve `404 Not Found`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Disease` (TDD-0007):** Debe contar con el flag `isDeleted`.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - Lógica de `destroy` (soft delete) en ViewSet de `Disease` y tests unitarios: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Relación con PetDisease)

```python
from django.db import models

class Disease(models.Model):
    idDisease = models.AutoField(primary_key=True, db_column="idDisease")
    name = models.CharField(max_length=100)
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "disease"
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `DELETE /api/v1/disease/{idDisease}/`

#### Response Body (`204 No Content`)
- *Respuesta vacía al completarse el soft delete.*

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente**:
   - Ejecuta `DELETE /api/v1/diseases/{idDisease}/`.
2. **Servidor (Django REST Framework)**:
   - `DiseaseViewSet.destroy()`: Obtiene la instancia activa (`isDeleted == False`).
   - Efectúa la baja lógica cambiando el flag de estado:
     ```python
     instance.isDeleted = True
     instance.save()
     ```
   - Al tratarse de una actualización de flag (`isDeleted = True`), los registros existentes en `PetDisease` conservan intacta la FK hacia `idDisease`.
   - El catálogo de consultas públicas (`GET /api/v1/disease /`) filtra automáticamente `isDeleted = False`, impidiendo que la enfermedad sea elegida para nuevos diagnósticos.
3. **Respuesta**:
   - Devuelve HTTP `204 No Content`.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **ID Inexistente** | Petición `DELETE` sobre un `idDisease` que no existe en DB. | `404 Not Found` |
| **Enfermedad ya eliminada** | Petición `DELETE` sobre un registro cuyo `isDeleted` ya es `true`. | `404 Not Found` |
| **Listado público tras baja** | Al consultar `GET /api/v1/disease/`, la enfermedad dada de baja lógica no debe figurar en el resultado. | `200 OK` (excluido) |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |


---

## Plan de Implementación

1. **Etapa 1 - Sobrescribir Borrado en ViewSet:**
   - Sobrescribir el método `destroy` o `perform_destroy` en `DiseaseViewSet` para realizar el cambio de estado a `isDeleted = True` y guardar la entidad.