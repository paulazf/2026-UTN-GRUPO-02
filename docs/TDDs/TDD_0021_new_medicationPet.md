---
id: 0021
estado: Implementado
autor: Matias Yael Cortes
fecha: 08-10-2026
titulo: Alta de Medicamento en Mascota
---

# TDD-0021: Alta de Medicamento en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores necesitan registrar qué medicamentos se le están administrando a una mascota, especificando la pauta de tratamiento (frecuencia en horas y cantidad de tomas), la fecha de inicio y notas u observaciones clínicas relevantes para un seguimiento seguro.
- **Resultado esperado:** Permitir al usuario registrar la asociación de un medicamento (`Medication`) a una de sus mascotas (`Pet`), definiendo la frecuencia de administración, la cantidad de ingestas, la fecha de inicio y notas opcionales. El sistema calcula de forma automática la fecha de finalización (`endDate`) y el estado del tratamiento en base a la pauta de dosis y frecuencia horaria.

### User Persona
- **Dueño de mascota (Owner):** Usuario registrado que desea asentar un tratamiento farmacológico en el perfil de su mascota.

### User Story
**Como** dueño de una mascota, **quiero** registrar un medicamento prescripto a mi mascota indicando su frecuencia, cantidad de dosis, fecha de inicio y observaciones, **para que** quede asentado su plan de medicación, calculando de manera automática la fecha de finalización del evento para control clínico y visualización en calendario.

### Criterios de Aceptación
- **Escenario de éxito (Asignación con éxito):**
  - Si se proporciona un `idPet` perteneciente a una mascota activa del usuario, un `idMedication` válido del catálogo (`isDeleted = false`), una `startDate` válida (no futura), un `frequencyHours` > 0, un `quantityDose` > 0, y opcionalmente notas, el sistema calcula automáticamente `endDate = startDate + max(0, ceil((frequencyHours * quantityDose) / 24) - 1)` (no nulleable), persiste el registro con `isDeleted = false` y devuelve `201 Created` con `status` ("En tratamiento" si `endDate >= today`, caso contrario "Finalizado").
- **Escenario de fallo (Datos obligatorios faltantes o inválidos):**
  - Si se omiten campos obligatorios o se envían valores menores o iguales a cero en frecuencia o dosis, el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Fecha futura):**
  - Si `startDate` es una fecha posterior al día actual (`today`), el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Mascota o medicamento inexistente o ajeno):**
  - Si el `idPet` o `idMedication` no existen, están dados de baja o la mascota pertenece a otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Tratamiento activo duplicado):**
  - Si la mascota ya posee un tratamiento activo (`endDate >= today` e `isDeleted = false`) para el mismo medicamento, el sistema impide la duplicación y devuelve `409 Conflict`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Pet` (TDD-0004):** Validación de pertenencia del animal al usuario autenticado.
2. **Entidad `Medication` (TDD-0014):** Catálogo global de medicamentos activos.
3. **Autenticación de usuario (TDD-0001):** Necesaria para identificar al dueño y asegurar que solo gestione sus propias mascotas.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `MedicationPet` y migración de base de datos con cálculo de `endDate`: *1 SP*
  - Serializer, validaciones de tratamientos activos concurrentes y endpoint `POST /api/v1/medication-pets/`: *1 SP*
  - Integración en frontend móvil (Pestaña "Tratamientos / Medicamentos" con modal de alta): *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
import math
from datetime import date, timedelta
from django.core.exceptions import ValidationError
from django.db import models
from .medication import Medication
from .pet import Pet


def calculate_medication_end_date(start_date: date, frequency_hours: int, quantity_dose: int) -> date:
    if not (start_date and frequency_hours and quantity_dose):
        return None
    total_hours = frequency_hours * quantity_dose
    calendar_days = math.ceil(total_hours / 24)
    days_to_add = max(0, calendar_days - 1)
    return start_date + timedelta(days=days_to_add)


class MedicationPet(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.PROTECT, related_name="medications", db_column="idPet")
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT, related_name="pet_treatments", db_column="idMedication")
    frequencyHours = models.IntegerField(db_column="frequencyHours")
    quantityDose = models.IntegerField(db_column="quantityDose")
    startDate = models.DateField(db_column="startDate")
    endDate = models.DateField(db_column="endDate")
    notes = models.TextField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medication_pet"
        ordering = ["-startDate", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "medication", "startDate"],
                condition=models.Q(isDeleted=False),
                name="unique_pet_medication_start_date",
            ),
        ]

    def clean(self):
        if self.startDate and self.startDate > date.today():
            raise ValidationError({"startDate": "La fecha de inicio no puede ser futura."})
        if self.frequencyHours is not None and self.frequencyHours <= 0:
            raise ValidationError({"frequencyHours": "La frecuencia en horas debe ser mayor a cero."})
        if self.quantityDose is not None and self.quantityDose <= 0:
            raise ValidationError({"quantityDose": "La cantidad por dosis debe ser mayor a cero."})

        if self.startDate and self.frequencyHours and self.quantityDose:
            self.endDate = calculate_medication_end_date(self.startDate, self.frequencyHours, self.quantityDose)

    def save(self, *args, **kwargs):
        if self.startDate and self.frequencyHours and self.quantityDose:
            self.endDate = calculate_medication_end_date(self.startDate, self.frequencyHours, self.quantityDose)
        super().save(*args, **kwargs)
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/medication-pets/`
- **Content-Type:** `application/json`

#### Request Body (JSON)

> [!NOTE]
> El campo `endDate` es calculado en el backend a partir de `startDate`, `frequencyHours` y `quantityDose`, por lo que es de solo lectura y no se envía en el cuerpo de la solicitud.

```json
{
  "idPet": 1,
  "idMedication": 4,
  "frequencyHours": 8,
  "quantityDose": 8,
  "startDate": "2026-10-25",
  "notes": "Administrar con alimento para evitar molestias gástricas."
}
```

#### Response Body (`201 Created`)

```json
{
  "id": 1,
  "idPet": 1,
  "petName": "Milo",
  "idMedication": 4,
  "medicationName": "Cefalexina",
  "frequencyHours": 8,
  "quantityDose": 8,
  "startDate": "2026-10-25",
  "endDate": "2026-10-27",
  "status": "En tratamiento",
  "notes": "Administrar con alimento para evitar molestias gástricas.",
  "isDeleted": false
}
```

## Arquitectura y Flujo (Cliente-Servidor / Expo Mobile)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - Al entrar al **perfil de la mascota**, el usuario navega a la pestaña **"Medicación"**.
   - En esta pestaña se visualiza el **listado de tratamientos farmacológicos** asociados al animal.
   - La interfaz incluye un botón destacado **"+ Agregar Medicación"**.
   - Al tocar el botón, se despliega un **modal** de alta que contiene:
     - **Selector de medicamento:** desplegable o buscador alimentado por el catálogo global.
     - **Frecuencia en horas (`frequencyHours`):** campo numérico entero para indicar cada cuántas horas se administra.
     - **Cantidad de dosis (`quantityDose`):** campo numérico entero con el total de tomas del tratamiento.
     - **Fecha de inicio (`startDate`):** selector de fecha (no futura).
     - **Notas u observaciones (`notes`):** campo de texto multilínea opcional.
   - Al pulsar "Guardar", se despacha la petición `POST /api/v1/medication-pets/`.
2. **Servidor (Django REST Framework)**:
   - `MedicationPetSerializer`:
     - Valida la existencia y pertenencia de `idPet` al usuario autenticado.
     - Valida la existencia de `idMedication` en el catálogo activo (`isDeleted = False`).
     - Valida las restricciones de rango (`startDate <= today`, `frequencyHours > 0` y `quantityDose > 0`).
     - Calcula `endDate = startDate + max(0, ceil((frequencyHours * quantityDose) / 24) - 1)`.
     - Verifica que no exista un tratamiento activo concurrente (`endDate >= today` e `isDeleted = False`) para la misma mascota y medicamento (`409 Conflict`).
   - Persiste el registro en la tabla `medication_pet`.
3. **Respuesta**:
   - Devuelve `201 Created` con el objeto serializado (incluyendo `endDate` calculado y `status`). 

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta exitosa con cálculo de endDate** | Datos válidos, `frequencyHours = 8`, `quantityDose = 8` calcula `endDate = startDate + 2 días`. | `201 Created` |
| **Frecuencia o dosis <= 0** | Valores inválidos en pauta de administración. | `400 Bad Request` |
| **Fecha de inicio futura** | `startDate` posterior a la fecha actual (`today`). | `400 Bad Request` |
| **Mascota ajena/inexistente** | `idPet` no existe o no pertenece al usuario. | `404 Not Found` |
| **Medicamento inexistente/eliminado** | `idMedication` no existe o tiene `isDeleted = true`. | `404 Not Found` |
| **Tratamiento activo duplicado** | La mascota ya tiene un registro activo (`endDate >= today`) del mismo medicamento. | `409 Conflict` |

---

## Plan de Implementación

1. **Etapa 1 - Modelo y Migraciones (Backend):** Modelo con `endDate` no nullable y cálculo automático en `save()` y migración de datos.
2. **Etapa 2 - Serializador y ViewSet (Backend):** Validación de activos (`endDate >= today`) y cálculo de `endDate`.
3. **Etapa 3 - UI Móvil (Frontend Expo):** Integrar servicio y visualización del rango calculado y estado del tratamiento.
