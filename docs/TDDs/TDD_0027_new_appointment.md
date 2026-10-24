---
id: 0027
estado: Por implementar
autor: Matias Yael Cortes
fecha: 24-10-2026
titulo: Alta de Turno Veterinario con Selector y Creación de Domicilio
---

# TDD-0027: Alta de Turno Veterinario con Selector y Creación de Domicilio

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores necesitan agendar consultas y turnos veterinarios (rutina, vacunas, cirugía o control) para sus mascotas, asociando el lugar físico donde se realizará la atención. El sistema debe permitir elegir cómodamente un domicilio frecuente ya guardado o registrar uno nuevo en el mismo flujo.
- **Resultado esperado:** Permitir al usuario agendar un turno (`Appointment`) para una de sus mascotas (`Pet`), definiendo la fecha (`date`), hora (`time`), veterinario (`veterinarian`), motivo (`description`) y vinculando un domicilio (`Address`) existente o creado en el momento.

### User Persona
- **Dueño de mascota (Owner):** Usuario que agenda una cita médica para su mascota y selecciona o carga el lugar de atención.

### User Story
**Como** dueño de una mascota, **quiero** agendar un turno veterinario indicando fecha, hora, veterinario, motivo y domicilio (seleccionándolo de mis guardados o creando uno nuevo), **para que** quede agendado en la historia clínica de mi mascota.

### Criterios de Aceptación
- **Escenario de éxito (Turno con domicilio existente):**
  - Si se proporciona un `idPet` propio, fecha (`date`) y hora (`time`) válidas, nombre de `veterinarian`, `description` y un `idAddress` perteneciente a los domicilios del usuario, crea el turno y devuelve `201 Created`.
- **Escenario de éxito (Turno con alta en caliente de domicilio):**
  - Si en lugar de un `idAddress` existente se envía el objeto `newAddress` (con calle, número, nombre de referencia e `idCity`), el sistema crea primero el domicilio y luego el turno asociado en una transacción atómica, devolviendo `201 Created`.
- **Escenario de éxito (Turno sin domicilio):**
  - Si `idAddress` es `null`, permite crear el turno sin dirección física asociada (ej. teleconsulta o pendiente de asignación).
- **Escenario de fallo (Campos obligatorios faltantes):**
  - Si falta `idPet`, `date`, `time` o `veterinarian`, devuelve `400 Bad Request`.
- **Escenario de fallo (Mascota ajena o inexistente):**
  - Si `idPet` no pertenece al usuario autenticado, devuelve `404 Not Found`.
- **Escenario de fallo (Colisión horaria):**
  - Si la mascota ya tiene un turno activo para la misma fecha y hora exacta, devuelve `409 Conflict`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Pet` (TDD-0004):** Mascota del usuario.
2. **Entidad `Address` (TDD-0026):** Domicilios guardados y validación de propiedad.
3. **Catálogo `City` y `Province` (TDD-0025):** Para la creación en caliente de domicilios.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `Appointment`, relaciones y migraciones: *1 SP*
  - Serializador con soporte para `idAddress` existente o payload anidado `newAddress`: *1 SP*
  - Modal móvil con selector desplegable de domicilios y acordeón "+ Nuevo domicilio": *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.core.exceptions import ValidationError
from api.models.pet import Pet
from api.models.address import Address

class Appointment(models.Model):
    idAppointment = models.AutoField(primary_key=True, db_column="idAppointment")
    pet = models.ForeignKey(
        Pet,
        on_delete=models.PROTECT,
        related_name="appointments",
        db_column="idPet",
    )
    address = models.ForeignKey(
        Address,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
        db_column="idAddress",
    )
    description = models.CharField(max_length=255, db_column="description")
    veterinarian = models.CharField(max_length=150, db_column="veterinarian")
    date = models.DateField(db_column="date")
    time = models.TimeField(db_column="time")
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "appointment"
        ordering = ["date", "time", "-idAppointment"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "date", "time"],
                condition=models.Q(isDeleted=False),
                name="unique_active_appointment_slot_per_pet",
            )
        ]

    def __str__(self):
        return f"{self.pet.name} - {self.date} {self.time} ({self.veterinarian})"
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/appointments/`

#### Request Body con Domicilio Existente
```json
{
  "idPet": 1,
  "description": "Control anual de vacunas",
  "veterinarian": "Dra. Silvina Gómez",
  "date": "2026-11-15",
  "time": "16:30:00",
  "idAddress": 3
}
```

#### Request Body con Alta en Caliente de Domicilio
```json
{
  "idPet": 1,
  "description": "Consulta dermatológica",
  "veterinarian": "Dr. Fernando Ruiz",
  "date": "2026-11-20",
  "time": "11:00:00",
  "newAddress": {
    "referenceName": "Clínica Veterinaria Belgrano",
    "idCity": 15,
    "street": "Av. Cabildo",
    "number": "2040",
    "floor": null,
    "apartment": null
  }
}
```

#### Response Body (`201 Created`)
```json
{
  "id": 1,
  "idPet": 1,
  "petName": "Milo",
  "description": "Control anual de vacunas",
  "veterinarian": "Dra. Silvina Gómez",
  "date": "2026-11-15",
  "time": "16:30:00",
  "idAddress": 3,
  "addressDetail": "Veterinaria San Roque (Av. Corrientes 1234, Palermo)",
  "isDeleted": false
}
```

---

## Arquitectura y UX en Frontend Móvil

1. **Selector desplegable de Domicilios frecuentes:**
   - Consume `GET /api/v1/addresses/` del usuario.
   - Muestra tarjetas de selección rápida con el alias (ej. *"Veterinaria San Roque"*).
2. **Opción "+ Agregar nuevo domicilio":**
   - Si no está en la lista, el usuario toca el botón de nuevo domicilio en el mismo modal.
   - Se despliegan los selectores de **Province** y **City** (con búsqueda en vivo) y campos de calle/número.
   - Al guardar, el domicilio se crea y queda guardado automáticamente para el futuro.

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta con domicilio existente** | Vinculación correcta de `idAddress` propio. | `201 Created` |
| **Alta con nuevo domicilio anidado** | Crea el domicilio y el turno en la misma transacción. | `201 Created` |
| **Alta sin domicilio** | Campo `idAddress = null` opcional. | `201 Created` |
| **Campos obligatorios faltantes** | Falta `date`, `time` o `veterinarian`. | `400 Bad Request` |
| **Colisión horaria** | Mismo horario agendado para la misma mascota. | `409 Conflict` |
| **Mascota ajena** | `idPet` no pertenece al usuario autenticado. | `404 Not Found` |

