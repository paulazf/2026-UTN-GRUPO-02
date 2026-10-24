---
id: 0028
estado: Por implementar
autor: Thiago Perez
fecha: 21-10-2026
titulo: Alta de Vacuna en Mascota
---

# TDD-0028: Alta de Vacuna en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los dueños no recuerdan cuándo se vacunó su mascota ni cuándo le toca el refuerzo o la próxima pipeta. La libreta sanitaria en papel se pierde o no está a mano.
- **Resultado esperado:** Permitir registrar cada aplicación (`VaccinePet`) de una vacuna o antiparasitario del catálogo a una mascota, con su número de dosis, fecha de aplicación y fecha de vencimiento.

### User Persona
- **Dueño de mascota (Owner):** Usuario autenticado que lleva el control de las vacunas y antiparasitarios de sus mascotas.

### User Story
**Como** dueño de una mascota, **quiero** registrar las vacunas y antiparasitarios que se le aplicaron, **para que** quede su historial y sepa cuándo vence cada uno.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si la mascota es del usuario y está activa, el producto está activo en el catálogo y los datos son válidos, el sistema crea el registro en `VaccinePet` con `isDeleted = false` y devuelve `201 Created` con el estado calculado.
- **Escenario de éxito (Antiparasitario):**
  - Si el producto es `EXTERNAL_ANTIPARASITIC` o `INTERNAL_ANTIPARASITIC`, se permite registrarlo sin `doseNumber`.
- **Escenario de fallo (Mascota inexistente o ajena):**
  - Si el `idPet` no existe, está dado de baja o pertenece a otro usuario, devuelve `404 Not Found` (no se revela si la mascota existe).
- **Escenario de fallo (Producto inexistente):**
  - Si el `idVaccine` no existe o está dado de baja en el catálogo, devuelve `404 Not Found`.
- **Escenario de fallo (Especie incompatible):**
  - Si el producto tiene `species` y no coincide con la especie de la mascota (`pet.breed.species`), devuelve `400 Bad Request`.
- **Escenario de fallo (Datos inválidos):**
  - Falta `idPet`, `idVaccine`, `applicationDate` o `expirationDate`; `doseNumber` falta o es menor a 1 siendo una vacuna; `applicationDate` es futura; `expirationDate` no es posterior a `applicationDate`. Devuelve `400 Bad Request`.
- **Escenario de fallo (Duplicado):**
  - Si la mascota ya tiene una aplicación activa del mismo producto con la misma `applicationDate`, devuelve `409 Conflict`.
- **Escenario de fallo (Autenticación):**
  - Sin token devuelve `401 Unauthorized`.

### Reglas de Negocio
- Cada refuerzo es un registro nuevo. Una mascota puede tener varias aplicaciones del mismo producto en fechas distintas (por eso `VaccinePet` tiene PK propia y no la PK compuesta del DER).
- Las pipetas y antiparasitarios se registran en esta misma entidad: comparten fecha de aplicación, vencimiento y estado.
- `notes` es opcional (hasta 255 caracteres), para aclarar un producto "Otra vacuna" u observaciones del veterinario.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Catálogo `Vaccine` (TDD-0025):** Modelo, seed y endpoint de consulta.
2. **Entidad `Pet` (EP02):** Con `breed.species` e `isDeleted`.
3. **Autenticación (EP01, TDD-0001) y `active_pets(request)`:** Para filtrar por dueño, igual que `MedicationPet`.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `VaccinePet`, migración y constraint de unicidad activa: *1 SP*
  - Serializer con validaciones de pertenencia, catálogo, especie, dosis, fechas y duplicados: *1 SP*
  - Endpoint `POST /api/v1/vaccine-pets/` y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models


class VaccinePet(models.Model):
    idVaccinePet = models.AutoField(primary_key=True, db_column="idVaccinePet")
    pet = models.ForeignKey("Pet", on_delete=models.PROTECT, db_column="idPet", related_name="vaccinePets")
    vaccine = models.ForeignKey("Vaccine", on_delete=models.PROTECT, db_column="idVaccine", related_name="applications")
    doseNumber = models.PositiveSmallIntegerField(null=True, blank=True)
    applicationDate = models.DateField()
    expirationDate = models.DateField()
    notes = models.CharField(max_length=255, blank=True, default="")
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vaccine_pet"
        ordering = ["-applicationDate", "-idVaccinePet"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "vaccine", "applicationDate"],
                condition=models.Q(isDeleted=False),
                name="unique_active_vaccine_application",
            )
        ]
```

### Cambios al DER
- `VacunaMascota` pasa a `VaccinePet` con PK propia `idVaccinePet` (la PK compuesta `idMascota` + `idVacuna` impedía registrar refuerzos).
- `nroDosis` pasa a `doseNumber` nullable (los antiparasitarios no tienen dosis).
- El campo `Tipo` se mueve al catálogo `Vaccine.type` (TDD-0025).
- Se agregan `notes`, `isDeleted`, `created_at` y `updated_at`.

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/vaccine-pets/`
- **Content-Type:** `application/json`
- **Autenticación:** `Authorization: Token <key>`

#### Request Body (JSON)

| Campo | Tipo | Obligatorio | Campo del mockup |
| --- | --- | --- | --- |
| `idPet` | INT | Sí | Mascota del perfil |
| `idVaccine` | INT | Sí | Nombre de la vacuna (selector del catálogo) |
| `doseNumber` | INT ≥ 1 | Solo si es vacuna | Número de dosis |
| `applicationDate` | DATE (`YYYY-MM-DD`) | Sí | Fecha de aplicación |
| `expirationDate` | DATE (`YYYY-MM-DD`) | Sí | Fecha de vencimiento |
| `notes` | STRING (máx. 255) | No | (nuevo) |

```json
{
  "idPet": 1,
  "idVaccine": 7,
  "doseNumber": 3,
  "applicationDate": "2026-04-20",
  "expirationDate": "2026-10-25",
  "notes": ""
}
```

#### Response Body (`201 Created`)

```json
{
  "idVaccinePet": 12,
  "idPet": 1,
  "petName": "Luna",
  "idVaccine": 7,
  "vaccineName": "Antirrábica",
  "laboratory": "Rabisin (Boehringer)",
  "vaccineType": "VACCINE",
  "doseNumber": 3,
  "applicationDate": "2026-04-20",
  "expirationDate": "2026-10-25",
  "notes": "",
  "status": "EXPIRING",
  "daysToExpiration": 4,
  "isDeleted": false
}
```

`status` y `daysToExpiration` se calculan al responder (ver TDD-0029).

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - En la pestaña Vacunas, el usuario toca "+ Agregar", elige el producto en `VaccinePicker` (filtrado por la especie de la mascota) y completa dosis y fechas. El vencimiento se precarga con `applicationDate + validityDays`.
   - Envía `POST /api/v1/vaccine-pets/`.
2. **Servidor (Django REST Framework)**:
   - `VaccinePetViewSet` exige autenticación.
   - `VaccinePetSerializer`, en este orden:
     1. `idPet`: debe estar en `active_pets(request)`; si no, `NotFound` (`404`).
     2. `idVaccine`: debe existir con `isDeleted = False`; si no, `NotFound` (`404`).
     3. Especie: si `vaccine.species` no es nulo y difiere de `pet.breed.species`, `400`.
     4. `doseNumber`: obligatorio y ≥ 1 si `vaccine.type == VACCINE`.
     5. `applicationDate <= today` y `expirationDate > applicationDate`.
     6. Duplicado activo (misma mascota, producto y `applicationDate`): `DuplicateVaccinePetException` (`409`).
   - Inserta el registro en `vaccine_pet`.
3. **Respuesta**:
   - Devuelve `201 Created` con los campos de solo lectura (`petName`, `vaccineName`, `laboratory`, `vaccineType`, `status`, `daysToExpiration`).

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta de vacuna** | Mascota propia, vacuna activa, dosis 1, fechas válidas. | `201 Created` |
| **Alta de pipeta sin dosis** | Producto `EXTERNAL_ANTIPARASITIC`, sin `doseNumber`. | `201 Created` |
| **Producto para ambas especies** | `species` nulo, mascota gato o perro. | `201 Created` |
| **Refuerzo** | Misma vacuna, dosis 2, otra `applicationDate`. | `201 Created` |
| **Vacuna sin dosis** | Producto `VACCINE` sin `doseNumber`. | `400 Bad Request` |
| **Dosis inválida** | `doseNumber = 0`. | `400 Bad Request` |
| **Especie incompatible** | "Triple Felina" (`CAT`) a un perro. | `400 Bad Request` |
| **Aplicación futura** | `applicationDate` posterior a hoy. | `400 Bad Request` |
| **Vencimiento inválido** | `expirationDate` igual o anterior a `applicationDate`. | `400 Bad Request` |
| **Campos obligatorios faltantes** | Sin `idPet`, `idVaccine`, `applicationDate` o `expirationDate`. | `400 Bad Request` |
| **Mascota inexistente o dada de baja** | `idPet` que no existe o `isDeleted = true`. | `404 Not Found` |
| **Mascota ajena** | `idPet` de otro usuario. | `404 Not Found` |
| **Producto inexistente o dado de baja** | `idVaccine` que no existe o `isDeleted = true`. | `404 Not Found` |
| **Duplicado activo** | Misma mascota, producto y fecha de aplicación. | `409 Conflict` |
| **Duplicado de un registro dado de baja** | El registro anterior tiene `isDeleted = true`. Se permite. | `201 Created` |
| **Sin autenticación** | Petición sin token. | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Ajustes al mockup (Figma)
- "Modal · Agregar vacuna" tiene nombre y laboratorio como texto libre. Se reemplazan por un selector del catálogo, igual que el de medicamentos.
- Se agrega el campo "Notas" (opcional).
- El campo "Número de dosis" se oculta cuando el producto elegido es un antiparasitario.
- Las pipetas dibujadas en "Medicación" (Advocate, Frontline Combo) pasan a la pestaña "Vacunas", sección "Antiparasitarios".

---

## Plan de Implementación

1. **Etapa 1 - Persistencia y Modelo:**
   - Definir `VaccinePet` en `Backend/api/models/vaccine_pet.py` y exportarlo en `models/__init__.py`.
   - Generar la migración (`python manage.py makemigrations api -n vaccine_pet`).
2. **Etapa 2 - Serializer:**
   - Crear `VaccinePetSerializer` y `DuplicateVaccinePetException` en `Backend/api/serializers/vaccine_pet.py`, reutilizando `active_pets(request)`.
3. **Etapa 3 - Endpoint y Enrutamiento:**
   - Crear `VaccinePetViewSet` en `Backend/api/views/vaccine_pet.py` con la acción `create`.
   - Registrar `router.register(r'vaccine-pets', VaccinePetViewSet, basename='vaccine-pet')`.
   - Registrar `VaccinePet` en `api/admin.py`.
4. **Etapa 4 - Tests:**
   - Un test por cada fila de la tabla, con `force_authenticate` y dos usuarios para los casos de mascota ajena.
