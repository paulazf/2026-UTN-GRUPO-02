---
id: 0007
estado: Por implementar
autor: Paula Zacarías
fecha: 01-10-2026
titulo: Alta de Enfermedad
---

# TDD-0007: Alta de Enfermedad

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Para garantizar la consistencia en los registros clínicos de las mascotas y evitar la duplicidad de nombres o errores tipográficos por parte de los usuarios, la aplicación requiere un catálogo precargado y centralizado de enfermedades.
- **Resultado esperado:** Permitir el registro de nuevas enfermedades (`Disease`) en el catálogo general del sistema mediante una operación administrativa/precarga.

### User Persona
- **Administrador de Sistema / Precarga:** Rol encargado de gestionar y mantener actualizado el catálogo global de enfermedades para que estén disponibles al asociarlas a una mascota.

### User Story
**Como** administrador del sistema, **quiero** dar de alta una nueva enfermedad en el catálogo global, **para que** pueda estar disponible al registrar la historia clínica de las mascotas.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si se proporciona un `name` válido que no existe en la base de datos, el sistema crea el registro en la tabla `Disease` asignando un `idDisease` autonumérico y marcando `isDeleted = false`.
- **Escenario de fallo (Datos faltantes o vacíos):**
  - Si se omite el campo `name` o se envía una cadena compuesta únicamente por espacios, el sistema rechaza la solicitud devolviendo `400 Bad Request`.
- **Escenario de fallo (Nombre duplicado / Case-Insensitive):**
  - Si se intenta registrar una enfermedad cuyo nombre ya existe (ignorando mayúsculas/minúsculas y espacios en los extremos, p. ej. "Rabia" vs "rabia"), el sistema impide la creación y devuelve `409 Conflict`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Infraestructura de Base de Datos:** Contenedor de PostgreSQL configurado con soporte para búsquedas case-insensitive (extensión/operador `citext` o función `LOWER()`).

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `Disease` y migraciones: *1 SP*
  - Serializer, validación case-insensitive y endpoint `POST /api/v1/diseases/`: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.db.models.functions import Lower

class Disease(models.Model):
    idDisease = models.AutoField(primary_key=True, db_column="idDisease")
    name = models.CharField(max_length=100)
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "disease"
        constraints = [
            models.UniqueConstraint(
                Lower('name'),
                condition=models.Q(isDeleted=False),
                name='unique_active_disease_name_case_insensitive'
            )
        ]

    def __str__(self):
        return self.name
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/diseases/`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Parvovirus"
}
```

#### Response Body (`201 Created`)

```json
{
  "idDisease": 1,
  "name": "Parvovirus",
  "isDeleted": false
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin App / Script / Postman)**:
   - Envía una petición `POST /api/v1/diseases/` con el payload conteniendo el nombre de la enfermedad.
2. **Servidor (Django REST Framework)**:
   - `DiseaseSerializer`: Recorta espacios en blanco (`strip()`) y valida que el campo no esté vacío.
   - Aplica validación personalizada para comprobar que no exista una enfermedad activa (`isDeleted = False`) con el mismo nombre (mediante `name__iexact`).
   - Inserta el registro en la tabla `disease` en PostgreSQL.
3. **Respuesta**:
   - Devuelve `201 Created` con el objeto `Disease` persistido.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Nombre faltante** | El campo `name` es obligatorio en el payload. | `400 Bad Request` |
| **Nombre compuesto solo por espacios** | El backend debe aplicar `strip()` y rechazar cadenas sin caracteres válidos. | `400 Bad Request` |
| **Nombre duplicado** | Intento de registrar "Moquillo" cuando ya existe "Moquillo"/"moquillo" activo. | `409 Conflict` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Persistencia y Modelo:**
   - Definir el modelo `Disease` en `Backend/api/models.py` incluyendo los campos `idDisease`, `name`, `isDeleted` y la restricción única case-insensitive (`UniqueConstraint` con `Lower`).
   - Generar y ejecutar la migración en PostgreSQL (`python manage.py makemigrations` y `migrate`).
2. **Etapa 2 - Lógica de Negocio y Serializer:**
   - Crear `DiseaseSerializer` en `Backend/api/serializers.py` con método `validate_name` para limpiezas (`strip()`) y verificación case-insensitive.
3. **Etapa 3 - Endpoint y Enrutamiento:**
   - Definir `DiseaseViewSet` en `Backend/api/views.py` permitiendo la acción de creación (`create`).
   - Registrar la ruta `diseases/` en `urls.py`.