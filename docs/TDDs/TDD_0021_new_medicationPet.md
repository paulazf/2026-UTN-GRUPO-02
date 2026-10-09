---
id: 0021
estado: Por implementar
autor: Matias Yael Cortes
fecha: 08-10-2026
titulo: Alta de Medicamento en Mascota
---

# TDD-0021: Alta de Medicamento en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores necesitan registrar qué medicamentos se le están administrando a una mascota, especificando la pauta de tratamiento (frecuencia en horas y cantidad de tomas), la fecha de inicio y notas u observaciones clínicas relevantes para un seguimiento seguro.
- **Resultado esperado:** Permitir al usuario registrar la asociación de un medicamento (`Medication`) a una de sus mascotas (`Pet`), definiendo la frecuencia de administración, la cantidad de ingestas, la fecha de inicio y notas opcionales.

### User Persona
- **Dueño de mascota (Owner):** Usuario registrado que desea asentar un tratamiento farmacológico activo en el perfil de su mascota.

### User Story
**Como** dueño de una mascota, **quiero** registrar un medicamento prescripto a mi mascota indicando su frecuencia, cantidad de dosis, fecha de inicio y observaciones, **para que** quede asentado su plan de medicación y pueda consultarlo o controlarlo fácilmente.

### Criterios de Aceptación
- **Escenario de éxito (Asignación con éxito):**
  - Si se proporciona un `idPet` perteneciente a una mascota activa del usuario, un `idMedication` válido del catálogo (`isDeleted = false`), una `startDate` válida (no futura), un `frequencyHours` > 0, un `quantityDose` > 0, y opcionalmente notas, el sistema crea el registro con `isDeleted = false` y devuelve `201 Created`.
- **Escenario de fallo (Datos obligatorios faltantes o inválidos):**
  - Si se omiten campos obligatorios o se envían valores menores o iguales a cero en frecuencia o dosis, el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Fecha futura):**
  - Si `startDate` es una fecha posterior al día actual (`today`), el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Mascota o medicamento inexistente o ajeno):**
  - Si el `idPet` o `idMedication` no existen, están dados de baja o la mascota pertenece a otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Tratamiento activo duplicado):**
  - Si la mascota ya tiene un registro activo (`isDeleted = false`) del mismo medicamento, el sistema impide la duplicación y devuelve `409 Conflict`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Pet` (TDD-0004):** Validación de pertenencia del animal al usuario autenticado.
2. **Entidad `Medication` (TDD-0014):** Catálogo global de medicamentos activos.
3. **Autenticación de usuario (TDD-0001):** Necesaria para identificar al dueño y asegurar que solo gestione sus propias mascotas.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `MedicationPet` y migración de base de datos: *1 SP*
  - Serializer, validaciones de duplicados activos y endpoint `POST /api/v1/medication-pets/`: *1 SP*
  - Integración en frontend móvil (Pestaña "Tratamientos / Medicamentos" con modal de alta): *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.core.exceptions import ValidationError
from datetime import date
from .pet import Pet
from .medication import Medication

class MedicationPet(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.PROTECT, related_name="medications", db_column="idPet")
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT, related_name="pet_treatments", db_column="idMedication")
    frequencyHours = models.IntegerField(db_column="frequencyHours")
    quantityDose = models.IntegerField(db_column="quantityDose")
    startDate = models.DateField(db_column="startDate")
    notes = models.TextField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")

    class Meta:
        db_table = "medication_pet"
        ordering = ["-startDate", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "medication"],
                condition=models.Q(isDeleted=False),
                name="unique_active_medication_per_pet",
            )
        ]

    def clean(self):
        if self.startDate and self.startDate > date.today():
            raise ValidationError({"startDate": "La fecha de inicio no puede ser futura."})
        if self.frequencyHours and self.frequencyHours <= 0:
            raise ValidationError({"frequencyHours": "La frecuencia en horas debe ser mayor a cero."})
        if self.quantityDose and self.quantityDose <= 0:
            raise ValidationError({"quantityDose": "La cantidad por dosis debe ser mayor a cero."})

    def __str__(self):
        return f"{self.pet.name} - {self.medication.name} (Cada {self.frequencyHours}hs)"
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/medication-pets/`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "idPet": 1,
  "idMedication": 4,
  "frequencyHours": 12,
  "quantityDose": 1,
  "startDate": "2026-10-05",
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
  "frequencyHours": 12,
  "quantityDose": 1,
  "startDate": "2026-10-05",
  "notes": "Administrar con alimento para evitar molestias gástricas.",
  "isDeleted": false
}
```

## Arquitectura y Flujo (Cliente-Servidor / Expo Mobile)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - Al entrar al **perfil de la mascota**, el usuario navega a la pestaña **"Medicación"**.
   - En esta pestaña se visualiza el **listado de tratamientos farmacológicos activos** asociados al animal.
   - La interfaz incluye un botón destacado **"+ Agregar Medicación"** (o botón flotante de acción).
   - Al tocar el botón, se despliega un **modal / bottom sheet** de alta que contiene:
     - **Selector de medicamento:** un dropdown o componente de búsqueda alimentado por el catálogo global (`GET /api/v1/medicaments/`).
     - **Frecuencia en horas (`frequencyHours`):** campo numérico entero para indicar cada cuántas horas se administra.
     - **Cantidad por dosis (`quantityDose`):** campo numérico entero para definir las unidades/pastillas por toma.
     - **Fecha de inicio (`startDate`):** selector de fecha nativo (validado para no permitir fechas futuras).
     - **Notas u observaciones (`notes`):** campo de texto multilínea opcional para aclaraciones clínicas (ej. "con alimento").
   - Al pulsar "Guardar", la aplicación valida localmente los campos obligatorios y la consistencia de los números enteros positivos, y despacha la petición `POST /api/v1/medication-pets/`.
2. **Servidor (Django REST Framework)**:
   - `MedicationPetSerializer`:
     - Valida la existencia de `idPet` y comprueba rigurosamente que la mascota pertenezca al usuario autenticado (`pet__owner = request.user`).
     - Valida la existencia de `idMedication` en el catálogo activo (`isDeleted = False`).
     - Valida las restricciones lógicas y de rango (`startDate <= today`, `frequencyHours > 0` y `quantityDose > 0`).
     - Verifica mediante restricciones a nivel de base de datos que no exista un tratamiento activo duplicado (`isDeleted = False`) para esa misma mascota y medicamento, arrojando un `409 Conflict` en caso de colisión.
   - Persiste el registro en la tabla relacional `medication_pet`.
3. **Respuesta**:
   - Devuelve `201 Created` con el objeto JSON serializado. 
   - La aplicación móvil cierra el modal, muestra un mensaje de éxito e inserta de forma dinámica el nuevo tratamiento en el listado de la pestaña correspondiente.

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta exitosa con notas** | Datos válidos, frecuencia y dosis > 0, sin duplicado activo. | `201 Created` |
| **Frecuencia o dosis <= 0** | Valores inválidos en pauta de administración. | `400 Bad Request` |
| **Fecha de inicio futura** | `startDate` posterior a la fecha actual (`today`). | `400 Bad Request` |
| **Mascota ajena/inexistente** | `idPet` no existe o no pertenece al usuario. | `404 Not Found` |
| **Duplicado activo** | La mascota ya tiene un registro activo del mismo medicamento. | `409 Conflict` |

---

## Plan de Implementación

1. **Etapa 1 - Modelo y Migraciones (Backend):** Crear modelo y migraciones en la base de datos.
2. **Etapa 2 - Serializador y ViewSet (Backend):** Implementar validaciones y el endpoint de alta.
3. **Etapa 3 - UI Móvil (Frontend Expo):** Integrar servicio y componentes visuales en la app.