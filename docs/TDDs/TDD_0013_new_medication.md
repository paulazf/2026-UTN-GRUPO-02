---
id: 0013
estado: Por implementar
autor: Matías Cortés
fecha: 05-10-2026
titulo: Alta de Medicamento en Catálogo
---

# TDD-0013: Alta de Medicamento en Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Para garantizar la consistencia y evitar la proliferación de duplicados o errores tipográficos cuando los usuarios cargan el historial médico de sus mascotas, la aplicación requiere un catálogo precargado y centralizado de medicamentos.
- **Resultado esperado:** Permitir el registro de nuevos medicamentos (`Medication`) en el catálogo general del sistema indicando su nombre, dosis estándar y descripción, mediante una operación administrativa/precarga.

### User Persona
- **Administrador de Sistema / Precarga:** Rol encargado de gestionar y mantener actualizado el catálogo global de medicamentos para que estén disponibles cuando los usuarios necesiten registrar la historia clínica de sus mascotas.

### User Story
**Como** administrador del sistema, **quiero** dar de alta un nuevo medicamento en el catálogo global, **para que** pueda estar disponible como opción cuando los dueños registren las medicaciones que toman sus mascotas.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si se ingresan datos válidos que no existen en la base de datos, el sistema crea el registro asignando un `idMedication` autonumérico y marcando `isDeleted = false`.
- **Escenario de fallo (Datos obligatorios faltantes):**
  - Si se omite `name` o `dose`, o si el nombre es solo espacios en blanco, el sistema rechaza la solicitud devolviendo `400 Bad Request`.
- **Escenario de fallo (Nombre y dosis duplicados / Case-Insensitive):**
  - Si se intenta registrar un medicamento cuya combinación de nombre (ignorando mayúsculas/minúsculas) y dosis ya existe y está activa, el sistema impide la creación y devuelve `409 Conflict`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Infraestructura de Base de Datos:** PostgreSQL configurado para búsquedas case-insensitive en las restricciones (mediante `Lower()`).

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo ORM y migraciones: *1 SP*
  - Serializer, validación case-insensitive y endpoint `POST /api/v1/medications/`: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.db.models.functions import Lower

class Medication(models.Model):
    idMedication = models.AutoField(primary_key=True, db_column="idMedication")
    name = models.CharField(max_length=100)
    dose = models.DecimalField(
        max_digits=6, 
        decimal_places=3 
    )
    description = models.TextField(
        blank=True, 
        null=True
    )
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medication"
        constraints = [
            models.UniqueConstraint(
                Lower('name'), 'dose',
                condition=models.Q(isDeleted=False),
                name='unique_active_medication_case_insensitive'
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.dose}"
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/medications/`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Amoxidal Duo",
  "dose": 500.000,
  "description": "Laboratorio Roemmers."
}
```

#### Response Body (201 Created)

```json
{
  "idMedication": 10,
  "name": "Amoxidal Duo",
  "dose": "500.000",
  "description": "Laboratorio Roemmers.",
  "isDeleted": false,
  "created_at": "2026-10-05T10:48:00Z"
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin App / Script / Postman):** 
   - Envía una petición `POST /api/v1/medications/` con el payload conteniendo los datos del medicamento.
2. **Servidor (Django REST Framework):**
   - `MedicationSerializer` recorta espacios en blanco del nombre (`strip()`) y valida los campos requeridos.
   - Aplica validación para asegurar que no exista otro medicamento activo con la misma combinación de `Lower(name)` y `dose`.
   - Inserta el registro en la tabla `medication`.
3. **Respuesta:** 
   - Devuelve `201 Created` con el objeto `Medication` persistido.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Datos obligatorios faltantes** | Se omite `name` o `dose`. | `400 Bad Request` |
| **Nombre vacío o inválido** | El `name` se envía vacío o solo contiene espacios (se debe aplicar `strip()`). | `400 Bad Request` |
| **Dosis inválida** | El campo `dose` es menor o igual a `0`. | `400 Bad Request` |
| **Duplicado Case-Insensitive** | Intento de registrar "amoxidal duo" con dosis 500 cuando ya existe "Amoxidal Duo" con dosis 500 activo. | `409 Conflict` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Persistencia y Modelo:**
   - Implementar el modelo `Medication` en `Backend/api/models.py` agregando la constraint con `Lower('name')`.
   - Ejecutar `makemigrations` y `migrate`.
2. **Etapa 2 - Endpoint y Serializer:**
   - Crear `MedicationSerializer` validando `strip()` y unicidad case-insensitive + dosis.
   - Habilitar `MedicationViewSet` para creación.