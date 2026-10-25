---
id: 0033
estado: Por implementar
autor: Matias Yael Cortes
fecha: 24-10-2026
titulo: Alta y Consulta de Domicilios con Alias de Referencia
---

# TDD-0033: Alta y Consulta de Domicilios con Alias de Referencia

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Al agendar turnos veterinarios, el tutor necesita indicar la dirección de la clínica o el lugar de atención. Tipear la dirección completa cada vez resulta engorroso. Además, los usuarios suelen recurrir habitualmente a los mismos lugares (su clínica de cabecera, hospital 24hs o su casa).
- **Resultado esperado:** Permitir al usuario registrar y consultar domicilios (`Address`) asociados a su cuenta, asignándoles un alias o nombre de referencia (`referenceName`, ej. *"Veterinaria San Roque"*, *"Clínica Central"*, *"Mi Casa"*) junto con su calle (`street`), número (`number`), piso (`floor`), departamento (`apartment`) y ciudad (`City`), para reutilizarlos en cualquier turno.

### User Persona
- **Dueño de mascota (Owner):** Usuario que desea guardar sus lugares frecuentes de atención veterinaria para seleccionarlos rápidamente.

### User Story
**Como** dueño de una mascota, **quiero** guardar domicilios frecuentes con un nombre de referencia, **para que** pueda seleccionarlos en un clic al agendar turnos sin tener que volver a ingresar todos los datos.

### Criterios de Aceptación
- **Escenario de éxito (Creación de Domicilio):**
  - Si se proporciona un `referenceName`, una `street`, un `number` y un `idCity` válido existente, el sistema crea el registro asociado al usuario autenticado y devuelve `201 Created`. `floor` y `apartment` son opcionales.
- **Escenario de éxito (Listado de Domicilios del Usuario):**
  - Al consultar `GET /api/v1/addresses/`, devuelve únicamente los domicilios activos (`isDeleted = false`) guardados por el usuario autenticado, ordenados por `referenceName`, con código `200 OK`.
- **Escenario de fallo (Datos obligatorios faltantes):**
  - Si falta `referenceName`, `street`, `number` o `idCity`, devuelve `400 Bad Request`.
- **Escenario de fallo (Ciudad inexistente):**
  - Si el `idCity` no existe en el catálogo, devuelve `400 Bad Request`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Catálogo de Ciudades (TDD-0032):** Clave foránea `idCity`.
2. **Autenticación (TDD-0001):** Asignación automática de `idOwner` a través de `request.user`.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `Address`, migraciones y serializador con validaciones: *1 SP*
  - Endpoints `GET` y `POST /api/v1/addresses/` con aislamiento por usuario: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from api.models.owner import Owner
from api.models.city import City

class Address(models.Model):
    idAddress = models.AutoField(primary_key=True, db_column="idAddress")
    owner = models.ForeignKey(
        Owner,
        on_delete=models.CASCADE,
        related_name="addresses",
        db_column="idOwner",
    )
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="addresses",
        db_column="idCity",
    )
    referenceName = models.CharField(max_length=120, db_column="referenceName") # Ej: "Veterinaria San Roque"
    street = models.CharField(max_length=150, db_column="street")
    number = models.CharField(max_length=20, db_column="number")
    floor = models.IntegerField(null=True, blank=True, db_column="floor")
    apartment = models.CharField(max_length=10, null=True, blank=True, db_column="apartment")
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "address"
        ordering = ["referenceName", "street"]

    def __str__(self):
        depto = f" {self.floor}° {self.apartment}" if self.floor or self.apartment else ""
        return f"{self.referenceName} - {self.street} {self.number}{depto} ({self.city.name})"
```

### Contrato de API (Django REST Framework)

#### 1. Alta de Domicilio
- **Endpoint:** `POST /api/v1/addresses/`
- **Request Body:**
```json
{
  "referenceName": "Veterinaria San Roque",
  "idCity": 15,
  "street": "Av. Corrientes",
  "number": "1234",
  "floor": 3,
  "apartment": "B"
}
```
- **Response (`201 Created`):**
```json
{
  "idAddress": 1,
  "referenceName": "Veterinaria San Roque",
  "idCity": 15,
  "cityName": "Palermo",
  "provinceName": "Ciudad Autónoma de Buenos Aires",
  "street": "Av. Corrientes",
  "number": "1234",
  "floor": 3,
  "apartment": "B",
  "fullAddress": "Av. Corrientes 1234 3° B, Palermo, Ciudad Autónoma de Buenos Aires",
  "isDeleted": false
}
```

#### 2. Listado de Domicilios Guardados por el Usuario
- **Endpoint:** `GET /api/v1/addresses/`
- **Response (`200 OK`):** Lista de domicilios creados por el usuario autenticado.

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta exitosa con piso/depto** | Datos obligatorios y opcionales válidos. | `201 Created` |
| **Alta exitosa sin piso/depto** | Solo calle y altura. | `201 Created` |
| **Falta nombre de referencia** | `referenceName` vacío o ausente. | `400 Bad Request` |
| **Ciudad inexistente** | `idCity` no existe en catálogo. | `400 Bad Request` |
| **Aislamiento entre usuarios** | Usuario B no ve los domicilios del Usuario A. | `200 OK` (solo propios) |

