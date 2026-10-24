---
id: 0029
estado: Por implementar
autor: Thiago Perez
fecha: 21-10-2026
titulo: Consulta de Vacunas de Mascota
---

# TDD-0029: Consulta de Vacunas de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El dueño necesita ver de un vistazo qué vacunas y antiparasitarios tiene vigentes cada mascota, cuáles están por vencer y cuáles ya vencieron, sin hacer cuentas con las fechas.
- **Resultado esperado:** Exponer el listado de aplicaciones activas con un estado calculado (Vigente, Por vencer, Vencida, Renovada), filtrable por mascota, estado, tipo y última aplicación de cada producto, y el detalle de una aplicación.

### User Persona
- **Dueño de mascota (Owner):** Usuario que consulta la libreta sanitaria de sus mascotas.

### User Story
**Como** dueño de una mascota, **quiero** ver sus vacunas y antiparasitarios con su estado, **para que** sepa cuáles tengo que renovar y cuándo.

### Criterios de Aceptación
- **Escenario de éxito (Por mascota):**
  - `GET /api/v1/vaccine-pets/?idPet={id}` con una mascota activa del usuario devuelve sus aplicaciones activas, ordenadas por `applicationDate` descendente, con `200 OK`. Sin aplicaciones, lista vacía.
- **Escenario de éxito (Todas las mascotas):**
  - Sin `idPet`, devuelve las aplicaciones activas de todas las mascotas activas del usuario (para los contadores del Inicio).
- **Escenario de éxito (Filtros):**
  - `?latest=true`: solo la aplicación más reciente de cada producto por mascota.
  - `?status=VALID|EXPIRING|EXPIRED`: solo las de ese estado (implica `latest=true`).
  - `?type=VACCINE|EXTERNAL_ANTIPARASITIC|INTERNAL_ANTIPARASITIC`: solo ese tipo de producto.
- **Escenario de éxito (Detalle):**
  - `GET /api/v1/vaccine-pets/{id}/` devuelve la aplicación con su estado.
- **Escenario de fallo (Parámetros inválidos):**
  - `idPet` no numérico, `status`, `type` o `latest` con valores no permitidos: `400 Bad Request`.
- **Escenario de fallo (Inexistente o ajeno):**
  - `idPet` inexistente, dado de baja o de otro usuario: `404 Not Found`. Detalle inexistente, eliminado o ajeno: `404 Not Found`.
- **Escenario de fallo (Autenticación):**
  - Sin token: `401 Unauthorized`.

### Reglas de Negocio
- El estado no se guarda en la base: se calcula en cada consulta con la fecha del día.

| Estado | Condición (en este orden) | Badge en la app |
| --- | --- | --- |
| `RENEWED` | Existe otra aplicación activa del mismo producto, para la misma mascota, con `applicationDate` posterior | No se muestra en la lista principal |
| `EXPIRED` | `expirationDate` < hoy | Vencida (rojo) |
| `EXPIRING` | hoy ≤ `expirationDate` ≤ hoy + 30 días | Por vencer (naranja) |
| `VALID` | `expirationDate` > hoy + 30 días | Vigente (verde) |

- El umbral de 30 días se configura en `settings.VACCINE_EXPIRING_DAYS`.
- `daysToExpiration` = `expirationDate` - hoy, en días (negativo si ya venció).
- Nunca se devuelven aplicaciones con `isDeleted = true` ni de mascotas dadas de baja.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `VaccinePet` (TDD-0028).**
2. **Autenticación y `active_pets(request)` (EP01).**

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - `get_queryset()` con filtro por dueño, `idPet`, `type` y anotación de renovadas (`Exists`): *1 SP*
  - Cálculo de estado, filtro `status` por rangos de fecha y `latest`: *1 SP*
  - Tests de visibilidad, estados y filtros: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `GET /api/v1/vaccine-pets/`

| Parámetro | Tipo | Obligatorio | Uso en la app |
| --- | --- | --- | --- |
| `idPet` | INT | No | Pestaña Vacunas de una mascota. Sin él: todas las mascotas del usuario |
| `latest` | `true` / `false` | No | Lista principal: una tarjeta por producto |
| `status` | `VALID` / `EXPIRING` / `EXPIRED` | No | Contadores del Inicio ("2 vacunas vencidas", "1 por vencer") |
| `type` | `VACCINE` / `EXTERNAL_ANTIPARASITIC` / `INTERNAL_ANTIPARASITIC` | No | Secciones Vacunas y Antiparasitarios |

#### Response Body (`200 OK`)

```json
[
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
]
```

- **Detalle:** `GET /api/v1/vaccine-pets/{idVaccinePet}/` devuelve el mismo objeto.

### Implementación del estado

```python
# settings.py
VACCINE_EXPIRING_DAYS = 30

# views/vaccine_pet.py, en get_queryset()
newer = VaccinePet.objects.filter(
    pet=OuterRef("pet"),
    vaccine=OuterRef("vaccine"),
    isDeleted=False,
    applicationDate__gt=OuterRef("applicationDate"),
)
queryset = (
    VaccinePet.objects.select_related("pet", "vaccine")
    .filter(isDeleted=False, pet__in=active_pets(self.request))
    .annotate(hasNewer=Exists(newer))
)

# filtro status por rangos de fecha (siempre sobre las últimas)
today = date.today()
limit = today + timedelta(days=settings.VACCINE_EXPIRING_DAYS)
if status == "EXPIRED":
    queryset = queryset.filter(hasNewer=False, expirationDate__lt=today)
elif status == "EXPIRING":
    queryset = queryset.filter(hasNewer=False, expirationDate__gte=today, expirationDate__lte=limit)
elif status == "VALID":
    queryset = queryset.filter(hasNewer=False, expirationDate__gt=limit)

# serializers/vaccine_pet.py
def get_status(self, obj):
    if getattr(obj, "hasNewer", False):
        return "RENEWED"
    days = (obj.expirationDate - date.today()).days
    if days < 0:
        return "EXPIRED"
    if days <= settings.VACCINE_EXPIRING_DAYS:
        return "EXPIRING"
    return "VALID"
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - Pestaña Vacunas: `GET /api/v1/vaccine-pets/?idPet={id}&latest=true`; agrupa por `vaccineType` en "Vacunas" y "Antiparasitarios" y pinta el badge según `status`.
   - Inicio: `GET ...?status=EXPIRED` y `GET ...?status=EXPIRING` para los contadores.
2. **Servidor (Django REST Framework)**:
   - Valida los parámetros (`400`) y la pertenencia de `idPet` (`404`).
   - Arma el queryset con la anotación `hasNewer` y aplica los filtros en la base.
   - El serializer agrega `status` y `daysToExpiration`.
3. **Respuesta**:
   - `200 OK` con la lista o el objeto.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Listado por mascota** | 3 aplicaciones activas, orden por fecha de aplicación descendente. | `200 OK` |
| **Mascota sin aplicaciones** | Devuelve `[]`. | `200 OK` |
| **Excluye eliminadas** | Una con `isDeleted = true` no aparece. | `200 OK` |
| **Todas mis mascotas** | Sin `idPet`, incluye las de mis dos mascotas y ninguna de otro usuario. | `200 OK` |
| **Estado Vigente** | Vence en 31 días o más. | `VALID` |
| **Estado Por vencer** | Vence hoy, o dentro de 30 días. | `EXPIRING` |
| **Estado Vencida** | Venció ayer. | `EXPIRED` |
| **Estado Renovada** | Hay una aplicación posterior del mismo producto. | `RENEWED` |
| **latest=true** | Dosis 1 y dosis 2 de la misma vacuna: solo aparece la 2. | `200 OK` |
| **status=EXPIRED** | Una vencida renovada no cuenta; solo las vencidas sin renovar. | `200 OK` |
| **type=EXTERNAL_ANTIPARASITIC** | Solo pipetas y similares. | `200 OK` |
| **Detalle propio** | `GET /{id}/` de una aplicación activa. | `200 OK` |
| **idPet no numérico** | `?idPet=abc`. | `400 Bad Request` |
| **status / type / latest inválidos** | `?status=OK`, `?type=PIPETA`, `?latest=si`. | `400 Bad Request` |
| **idPet ajeno, inexistente o dado de baja** | | `404 Not Found` |
| **Detalle inexistente, eliminado o ajeno** | | `404 Not Found` |
| **Sin autenticación** | | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Queryset y filtros:**
   - Implementar `get_queryset()` en `VaccinePetViewSet` con `select_related`, filtro por dueño, anotación `hasNewer` y filtros `idPet`, `latest`, `status` y `type`, validando cada parámetro.
2. **Etapa 2 - Estado calculado:**
   - Agregar `VACCINE_EXPIRING_DAYS` en `settings.py` y los `SerializerMethodField` `status` y `daysToExpiration`.
3. **Etapa 3 - Acciones de lectura:**
   - Habilitar `list` y `retrieve`.
4. **Etapa 4 - Tests:**
   - Un test por cada fila de la tabla. Las fechas se arman relativas a `date.today()` para que los tests no venzan.
