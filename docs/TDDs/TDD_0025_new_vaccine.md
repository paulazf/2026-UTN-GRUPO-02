---
id: 0025
estado: Por implementar
autor: Thiago Perez
fecha: 21-10-2026
titulo: Alta de Vacuna en el Catálogo
---

# TDD-0025: Alta de Vacuna en el Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Para registrar las vacunas y antiparasitarios aplicados a cada mascota sin que cada usuario escriba el nombre a su manera ("Triple felina", "triple Felina", "Tricat"), la aplicación necesita un catálogo centralizado y precargado de productos.
- **Resultado esperado:** Permitir el registro de productos (`Vaccine`) en el catálogo global: vacunas, antiparasitarios externos (pipetas, collares, comprimidos antipulgas) y antiparasitarios internos (desparasitación), con su laboratorio, la especie a la que aplican y su vigencia habitual.

### User Persona
- **Administrador de Sistema / Precarga:** Rol encargado de mantener actualizado el catálogo para que los productos estén disponibles al registrar las aplicaciones de cada mascota.

### User Story
**Como** administrador del sistema, **quiero** dar de alta vacunas y antiparasitarios en el catálogo, **para que** los dueños puedan seleccionarlos al registrar lo que se le aplicó a su mascota.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si se envía un `name` válido, un `type` permitido y la combinación de nombre y laboratorio no existe entre los registros activos, el sistema crea el registro con `idVaccine` autonumérico, `isDeleted = false` y devuelve `201 Created`.
- **Escenario de fallo (Datos faltantes o vacíos):**
  - Si falta `name` o se envía solo con espacios, devuelve `400 Bad Request`.
- **Escenario de fallo (Valores inválidos):**
  - Si `type` o `species` no son valores permitidos, o `validityDays` es menor o igual a 0, devuelve `400 Bad Request`.
- **Escenario de fallo (Duplicado):**
  - Si ya existe un producto activo con el mismo `name` y `laboratory` (sin distinguir mayúsculas ni espacios en los extremos), devuelve `409 Conflict`.
- **Escenario de fallo (Autenticación):**
  - Sin autenticación devuelve `401 Unauthorized`.

### Reglas de Negocio
- Tipos (`type`): `VACCINE` (Vacuna), `EXTERNAL_ANTIPARASITIC` (Antiparasitario externo: pipeta, collar, comprimido antipulgas), `INTERNAL_ANTIPARASITIC` (Antiparasitario interno).
- Especie (`species`): `DOG`, `CAT` o vacío. Vacío significa que el producto sirve para perros y gatos. Usa el mismo enum `PetSpecies` que `Breed`.
- `validityDays` es opcional. Indica la vigencia habitual en días (365 para una vacuna anual, 30 para una pipeta mensual) y el front lo usa para precargar la fecha de vencimiento.
- El catálogo se precarga con una migración de datos (seed), igual que razas, enfermedades y medicamentos.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Enum `PetSpecies` (EP02 - CRUD Mascota):** Ya existe en `api/models/breed.py`.
2. **Autenticación (EP01, TDD-0001):** Todos los endpoints exigen token, igual que el catálogo `Medication`.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `Vaccine`, migración de esquema y seed: *1 SP*
  - Serializer, validaciones, control de duplicados, endpoint `POST /api/v1/vaccines/` y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

from .breed import PetSpecies


class VaccineType(models.TextChoices):
    VACCINE = "VACCINE", "Vacuna"
    EXTERNAL_ANTIPARASITIC = "EXTERNAL_ANTIPARASITIC", "Antiparasitario externo"
    INTERNAL_ANTIPARASITIC = "INTERNAL_ANTIPARASITIC", "Antiparasitario interno"


class Vaccine(models.Model):
    idVaccine = models.AutoField(primary_key=True, db_column="idVaccine")
    name = models.CharField(max_length=100)
    laboratory = models.CharField(max_length=100, blank=True, default="")
    type = models.CharField(max_length=30, choices=VaccineType.choices, default=VaccineType.VACCINE)
    species = models.CharField(max_length=10, choices=PetSpecies.choices, null=True, blank=True)
    validityDays = models.PositiveIntegerField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vaccine"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"), Lower("laboratory"),
                condition=Q(isDeleted=False),
                name="unique_active_vaccine_name_laboratory",
            )
        ]
```

### Seed inicial

| Nombre | Laboratorio | Tipo | Especie | Días |
| --- | --- | --- | --- | --- |
| Séxtuple | Canigen (Virbac) | VACCINE | DOG | 365 |
| Quíntuple | Vanguard Plus 5 (Zoetis) | VACCINE | DOG | 365 |
| Leptospirosis | Nobivac L4 (MSD) | VACCINE | DOG | 365 |
| Tos de las perreras | Nobivac KC (MSD) | VACCINE | DOG | 365 |
| Triple Felina | Nobivac Tricat (MSD) | VACCINE | CAT | 365 |
| Leucemia Felina | Purevax FeLV (Boehringer) | VACCINE | CAT | 365 |
| Antirrábica | Rabisin (Boehringer) | VACCINE | (ambas) | 365 |
| Frontline Plus | Boehringer | EXTERNAL_ANTIPARASITIC | (ambas) | 30 |
| Advocate | Elanco | EXTERNAL_ANTIPARASITIC | (ambas) | 30 |
| Revolution | Zoetis | EXTERNAL_ANTIPARASITIC | (ambas) | 30 |
| NexGard | Boehringer | EXTERNAL_ANTIPARASITIC | DOG | 30 |
| Simparica | Zoetis | EXTERNAL_ANTIPARASITIC | DOG | 30 |
| Bravecto | MSD | EXTERNAL_ANTIPARASITIC | (ambas) | 90 |
| Seresto (collar) | Elanco | EXTERNAL_ANTIPARASITIC | (ambas) | 240 |
| Drontal Plus | Elanco | INTERNAL_ANTIPARASITIC | DOG | 90 |
| Total Full | Holliday | INTERNAL_ANTIPARASITIC | (ambas) | 90 |
| Milbemax | Elanco | INTERNAL_ANTIPARASITIC | (ambas) | 90 |
| Otra vacuna | (vacío) | VACCINE | (ambas) | 365 |
| Otro antiparasitario | (vacío) | EXTERNAL_ANTIPARASITIC | (ambas) | 30 |

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/vaccines/`
- **Content-Type:** `application/json`
- **Autenticación:** `Authorization: Token <key>`.

#### Request Body (JSON)

```json
{
  "name": "Triple Felina",
  "laboratory": "Nobivac Tricat (MSD)",
  "type": "VACCINE",
  "species": "CAT",
  "validityDays": 365
}
```

#### Response Body (`201 Created`)

```json
{
  "idVaccine": 5,
  "name": "Triple Felina",
  "laboratory": "Nobivac Tricat (MSD)",
  "type": "VACCINE",
  "species": "CAT",
  "validityDays": 365,
  "isDeleted": false
}
```

#### Response Body (`409 Conflict`)

```json
{
  "detail": "Ya existe un producto activo con el mismo nombre y laboratorio."
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin / Postman / Django Admin)**:
   - Envía `POST /api/v1/vaccines/` con el producto.
2. **Servidor (Django REST Framework)**:
   - `VaccineViewSet` usa los permisos por defecto del proyecto (`IsAuthenticated`), igual que `MedicationViewSet`.
   - `VaccineSerializer`:
     - `validate_name`: aplica `strip()`, rechaza vacíos y más de 100 caracteres.
     - `validate_laboratory`: aplica `strip()`.
     - `validate_validityDays`: si viene, debe ser mayor a 0.
     - `validate`: busca otro producto activo con `name__iexact` y `laboratory__iexact`; si existe, lanza `DuplicateVaccineException` (`409`).
   - Inserta el registro en la tabla `vaccine`.
3. **Respuesta**:
   - Devuelve `201 Created` con el producto creado.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta completa** | Todos los campos válidos. | `201 Created` |
| **Alta mínima** | Solo `name` y `type`. `laboratory` queda vacío, `species` y `validityDays` en `null`. | `201 Created` |
| **Nombre faltante o solo espacios** | `name` ausente o `"   "`. | `400 Bad Request` |
| **Nombre demasiado largo** | Más de 100 caracteres. | `400 Bad Request` |
| **Tipo inválido** | `type = "PIPETA"`. | `400 Bad Request` |
| **Especie inválida** | `species = "BIRD"`. | `400 Bad Request` |
| **Vigencia inválida** | `validityDays = 0` o negativo. | `400 Bad Request` |
| **Duplicado exacto** | Ya existe "Triple Felina" / "Nobivac Tricat (MSD)" activo. | `409 Conflict` |
| **Duplicado con mayúsculas y espacios** | `" triple felina "` / `"NOBIVAC TRICAT (MSD)"`. | `409 Conflict` |
| **Mismo nombre, otro laboratorio** | "Antirrábica" de otro laboratorio. Se permite. | `201 Created` |
| **Nombre de un producto dado de baja** | Existe el mismo producto con `isDeleted = true`. Se permite. | `201 Created` |
| **Sin autenticación** | Petición sin token. | `401 Unauthorized` |
| **Seed aplicado** | Tras `migrate`, `GET /api/v1/vaccines/` devuelve los 19 productos. | `200 OK` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

### Consulta del catálogo
Este TDD define también el `GET` del catálogo, que usa el selector del front:
- `GET /api/v1/vaccines/`: productos activos ordenados por nombre. Filtros opcionales `?type=`, `?species=` (devuelve los de esa especie y los que tienen `species` vacío) y `?search=` (por nombre o laboratorio).
- `GET /api/v1/vaccines/{idVaccine}/`: detalle de un producto activo, `404` si no existe o está dado de baja.
- Filtros con valores no permitidos devuelven `400 Bad Request`.

---

## Plan de Implementación

1. **Etapa 1 - Persistencia y Modelo:**
   - Crear `VaccineType` y `Vaccine` en `Backend/api/models/vaccine.py` y exportarlos en `models/__init__.py`.
   - Generar la migración de esquema (`python manage.py makemigrations api -n vaccine`).
2. **Etapa 2 - Seed:**
   - Crear la migración de datos `seed_vaccines` con `RunPython` y su función inversa, siguiendo `seed_medications`.
3. **Etapa 3 - Serializer:**
   - Crear `VaccineSerializer` y `DuplicateVaccineException` en `Backend/api/serializers/vaccine.py`.
4. **Etapa 4 - Endpoint y Enrutamiento:**
   - Crear `VaccineViewSet` en `Backend/api/views/vaccine.py` con los filtros del listado.
   - Registrar `router.register(r'vaccines', VaccineViewSet, basename='vaccine')` en `api/urls.py`.
   - Registrar `Vaccine` en `api/admin.py`.
5. **Etapa 5 - Tests:**
   - Un test por cada fila de la tabla de casos de prueba.
