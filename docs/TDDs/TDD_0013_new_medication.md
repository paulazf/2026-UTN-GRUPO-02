---
id: 0013
estado: Por implementar
autor: Matías Cortés
fecha: 02-10-2026
titulo: Alta de Medicamento en Catálogo
---

# TDD-0013: Alta de Medicamento en Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Para prescribir o registrar tratamientos en las mascotas, el sistema necesita contar con un catálogo centralizado de medicamentos.
- **Resultado esperado:** Permitir que el usuario (dueño o profesional) registre un nuevo medicamento (`Medication`) en el catálogo base indicando su nombre, dosis estándar y una descripción opcional donde puede detallar las drogas que lo componen, el laboratorio o notas adicionales.

### User Persona
- **Dueño / Tutor (`Owner`) / Usuario de la App:** Usuario que desea registrar un medicamento comercial en la base global para luego poder asignarlo a la historia clínica de su mascota.

### User Story
**Como** usuario de la app, **quiero** dar de alta un medicamento indicando su nombre, dosis y detalles adicionales, **para que** quede disponible en el catálogo del sistema y pueda ser prescripto en los tratamientos.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si se ingresan datos válidos (`name`, `dose` y opcionalmente `description`), el sistema registra el medicamento en `Medication` y asigna `isDeleted = false`.
- **Escenario de fallo (Datos obligatorios faltantes):**
  - Si se omiten campos requeridos (`name` o `dose`), el sistema impide la creación y retorna `400 Bad Request`.
- **Escenario de fallo (Medicamento duplicado activo):**
  - Si se intenta crear un medicamento con el mismo nombre y concentración que uno ya existente y activo (`isDeleted = false`), el sistema rechaza la operación devolviendo `409 Conflict`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Modelado Base:** Definición de la tabla `Medication` sin dependencias externas complejas.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo ORM y migraciones: *1 SP*
  - Serializer y endpoint `POST /api/v1/medications/`: *1 SP*
  - Formulario de alta en Expo: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.db.models import Q

class Medication(models.Model):
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
                fields=['name', 'dose'],
                condition=Q(isDeleted=False),
                name='unique_active_medication_name_dose'
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.dose}"
```

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `POST /api/v1/medications/`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Amoxidal Duo",
  "dose": 500.000,
  "description": "Compuesto por Amoxicilina y Ácido Clavulánico. Laboratorio Roemmers."
}
```

#### Response Body (201 Created)

```json
{
  "id": 10,
  "name": "Amoxidal Duo",
  "dose": "500.000",
  "description": "Compuesto por Amoxicilina y Ácido Clavulánico. Laboratorio Roemmers.",
  "isDeleted": false,
  "created_at": "2026-10-02T10:48:00Z"
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go):** El usuario completa el formulario de "Nuevo Medicamento" con nombre, dosis y descripción (opcional). Al guardar, la app arma el payload y envía `POST /api/v1/medications/`.
2. **Servidor (Django REST Framework):**
   - `MedicationSerializer` valida los datos recibidos (asegurando que se cumplan las restricciones de datos y de unicidad de nombre y dosis activa).
   - `MedicationViewSet` (mediante el serializer) guarda el registro directamente en la tabla unificada `Medication` de PostgreSQL.
3. **Respuesta:** El servidor devuelve `201 Created` con el objeto serializado del medicamento; el cliente muestra un mensaje de éxito y redirige al usuario al listado del catálogo general.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Datos obligatorios faltantes** | Se omite `name` o `dose` en el payload. | `400 Bad Request` |
| **Nombre vacío o inválido** | El campo `name` se envía vacío o solo contiene espacios (se debe aplicar `strip()`). | `400 Bad Request` |
| **Dosis inválida** | El campo `dose` es menor o igual a `0`. | `400 Bad Request` |
| **Medicamento duplicado** | Intento de registrar un medicamento con el mismo `name` y `dose` que otro ya activo. | `409 Conflict` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Persistencia (Backend):**
   - Implementar el modelo `Medication` en `Backend/api/models.py`.
   - Ejecutar `makemigrations` y `migrate` en PostgreSQL.
2. **Etapa 2 - Endpoint (Backend):**
   - Crear `MedicationSerializer` y `MedicationViewSet`.
   - Habilitar el endpoint `POST /api/v1/medications/`.
3. **Etapa 3 - Frontend (Expo Mobile):**
   - Crear la pantalla `CreateMedicationScreen` con el formulario correspondiente.