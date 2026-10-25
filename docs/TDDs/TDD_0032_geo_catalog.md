---
id: 0032
estado: Por implementar
autor: Matias Yael Cortes
fecha: 24-10-2026
titulo: Catálogo Geográfico de Provincias y Ciudades de Argentina
---

# TDD-0032: Catálogo Geográfico de Provincias y Ciudades de Argentina

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Al cargar domicilios para clínicas veterinarias, consultorios o visitas domiciliarias, los usuarios suelen ingresar nombres de provincias y localidades con faltas de ortografía, variantes tipográficas o abreviaturas inconsistentes (ej. "Bs As", "Buenos Aires", "CABA", "Capital Federal"), lo que imposibilita la estandarización y búsqueda de ubicaciones.
- **Resultado esperado:** Proveer un catálogo normalizado y precargado de las 24 provincias argentinas (23 provincias + CABA) y sus respectivas ciudades/localidades (`City`), accesible mediante endpoints de lectura y búsqueda en tiempo real para poblar selectores desplegables en la aplicación.

### User Persona
- **Dueño de mascota (Owner):** Usuario que al registrar un nuevo domicilio puede seleccionar rápidamente la provincia y localidad desde un listado autocompletable sin errores.

### User Story
**Como** dueño de una mascota, **quiero** seleccionar la provincia y localidad desde un listado precargado de Argentina, **para que** los domicilios de atención veterinaria queden correctamente estandarizados sin errores de tipeo.

### Criterios de Aceptación
- **Escenario de éxito (Listado de Provincias):**
  - Al consultar `GET /api/v1/provinces/`, el sistema devuelve las 24 jurisdicciones de Argentina ordenadas alfabéticamente por nombre con código `200 OK`.
- **Escenario de éxito (Listado de Ciudades por Provincia):**
  - Al consultar `GET /api/v1/cities/?idProvince={id}`, devuelve las ciudades asociadas a esa provincia con código `200 OK`.
- **Escenario de éxito (Buscador en tiempo real de Ciudades):**
  - Al consultar `GET /api/v1/cities/?idProvince={id}&search={term}`, filtra las ciudades cuyo nombre contenga el término buscado (case-insensitive) y devuelve `200 OK`.
- **Escenario de fallo (Provincia no encontrada):**
  - Si `idProvince` no existe, devuelve `404 Not Found`.
- **Escenario de fallo (Parámetros inválidos):**
  - Si `idProvince` no es numérico, devuelve `400 Bad Request`.

### Reglas de Negocio
- `Province` y `City` son catálogos de **solo lectura** para los usuarios finales (`ReadOnlyModelViewSet`).
- Se precargan mediante un fixture / seed inicial de base de datos (`fixtures/argentina_geo.json` o migración de datos).

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Configuración de base de datos PostgreSQL.**
2. **Dataset inicial de Argentina:** Listado oficial de las 24 provincias y ciudades principales.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelos `Province` y `City`, migraciones y fixture de datos iniciales: *1 SP*
  - Vistas de lectura con filtros `DjangoFilterBackend` / `SearchFilter`: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models

class Province(models.Model):
    idProvince = models.AutoField(primary_key=True, db_column="idProvince")
    name = models.CharField(max_length=100, unique=True, db_column="name")

    class Meta:
        db_table = "province"
        ordering = ["name"]

    def __str__(self):
        return self.name


class City(models.Model):
    idCity = models.AutoField(primary_key=True, db_column="idCity")
    province = models.ForeignKey(
        Province,
        on_delete=models.PROTECT,
        related_name="cities",
        db_column="idProvince",
    )
    name = models.CharField(max_length=150, db_column="name")

    class Meta:
        db_table = "city"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["province", "name"],
                name="unique_city_per_province",
            )
        ]

    def __str__(self):
        return f"{self.name}, {self.province.name}"
```

### Contrato de API (Django REST Framework)

#### 1. Provincias
- **Endpoint:** `GET /api/v1/provinces/`
- **Response (`200 OK`):**
```json
[
  { "idProvince": 1, "name": "Buenos Aires" },
  { "idProvince": 2, "name": "Ciudad Autónoma de Buenos Aires" },
  { "idProvince": 3, "name": "Córdoba" },
  { "idProvince": 4, "name": "Santa Fe" }
]
```

#### 2. Ciudades por Provincia y Búsqueda
- **Endpoint:** `GET /api/v1/cities/?idProvince=2&search=paler`
- **Response (`200 OK`):**
```json
[
  {
    "idCity": 15,
    "idProvince": 2,
    "provinceName": "Ciudad Autónoma de Buenos Aires",
    "name": "Palermo"
  }
]
```

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Listado total de provincias** | Devuelve las 24 provincias ordenadas alfabéticamente. | `200 OK` |
| **Filtrado de ciudades por provincia** | Devuelve solo ciudades de la provincia indicada. | `200 OK` |
| **Búsqueda por término parcial** | Filtra coincidencias en el nombre de la ciudad. | `200 OK` |
| **Provincia inexistente** | Parámetro `idProvince=9999`. | `404 Not Found` |
| **Parámetro no numérico** | Parámetro `idProvince=abc`. | `400 Bad Request` |

