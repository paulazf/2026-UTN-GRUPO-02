---
id: 0026
estado: Por implementar
autor: Thiago Perez
fecha: 21-10-2026
titulo: Modificación de Vacuna en el Catálogo
---

# TDD-0026: Modificación de Vacuna en el Catálogo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Corregir errores de carga en el catálogo (nombre mal escrito, laboratorio equivocado, especie o vigencia incorrecta) sin afectar las aplicaciones ya registradas en las mascotas.
- **Resultado esperado:** Permitir actualizar los datos de un `Vaccine` existente mediante su `idVaccine`.

### User Persona
- **Administrador de Sistema / Precarga:** Usuario encargado del mantenimiento del catálogo.

### User Story
**Como** administrador del sistema, **quiero** modificar los datos de un producto del catálogo, **para que** la información que ven los dueños sea correcta sin romper los registros ya cargados.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el producto existe, está activo y los nuevos datos son válidos, el sistema lo actualiza y devuelve `200 OK`. Las aplicaciones de `VaccinePet` que lo referencian muestran el dato actualizado, porque apuntan por `idVaccine`.
- **Escenario de fallo (Registro no encontrado):**
  - Si el `idVaccine` no existe o está dado de baja, devuelve `404 Not Found`.
- **Escenario de fallo (Datos inválidos):**
  - Mismas validaciones de campo que el alta (TDD-0025): `400 Bad Request`.
- **Escenario de fallo (Duplicado):**
  - Si el nuevo nombre y laboratorio coinciden con **otro** producto activo, devuelve `409 Conflict`.
- **Escenario de fallo (Autenticación):**
  - Sin autenticación devuelve `401 Unauthorized`.

### Reglas de Negocio
- Cambiar `type` o `species` de un producto ya usado en aplicaciones está permitido, pero no reescribe esas aplicaciones: las validaciones de especie y dosis de TDD-0028 se aplican solo a altas y ediciones nuevas.
- Se admite `PUT` (todos los campos) y `PATCH` (parcial), igual que `Medication`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Vaccine` (TDD-0025):** Modelo, serializer y endpoint de alta.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - Habilitar `update` / `partial_update`, excluir la instancia en el control de duplicados y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `PATCH /api/v1/vaccines/{idVaccine}/` (o `PUT`)
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "laboratory": "Nobivac Tricat Trio (MSD)",
  "validityDays": 365
}
```

#### Response Body (`200 OK`)

```json
{
  "idVaccine": 5,
  "name": "Triple Felina",
  "laboratory": "Nobivac Tricat Trio (MSD)",
  "type": "VACCINE",
  "species": "CAT",
  "validityDays": 365,
  "isDeleted": false
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (Admin / Postman)**:
   - Envía `PATCH /api/v1/vaccines/{idVaccine}/` con los campos a cambiar.
2. **Servidor (Django REST Framework)**:
   - `VaccineViewSet.get_queryset()` solo incluye `isDeleted = False`. Si no está, `404`.
   - `VaccineSerializer.validate`: combina los datos enviados con los de la instancia y busca duplicados excluyendo `pk=instance.pk`.
   - Guarda los cambios.
3. **Respuesta**:
   - Devuelve `200 OK` con el producto actualizado.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Cambio de laboratorio** | `PATCH` solo con `laboratory`. | `200 OK` |
| **Cambio de vigencia** | `PATCH` con `validityDays = 30`. | `200 OK` |
| **PUT completo** | Todos los campos válidos. | `200 OK` |
| **Mismo nombre actual** | Se envía el mismo `name` y `laboratory`. No choca consigo mismo. | `200 OK` |
| **Producto usado en aplicaciones** | El cambio de nombre se ve en `GET /api/v1/vaccine-pets/`. | `200 OK` |
| **ID Inexistente** | `idVaccine` que no existe. | `404 Not Found` |
| **Producto dado de baja** | `isDeleted = true`. | `404 Not Found` |
| **Nombre vacío** | `name = "  "`. | `400 Bad Request` |
| **Valores inválidos** | `type`, `species` o `validityDays` inválidos. | `400 Bad Request` |
| **Colisión con otro producto** | Nombre y laboratorio de otro producto activo. | `409 Conflict` |
| **Sin autenticación** | Petición sin token. | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Serializer:**
   - En `VaccineSerializer.validate`, excluir `self.instance` de la búsqueda de duplicados y tomar de la instancia los campos que no lleguen en un `PATCH`.
2. **Etapa 2 - Endpoint:**
   - Habilitar `update` y `partial_update` en `VaccineViewSet`.
3. **Etapa 3 - Tests:**
   - Un test por cada fila de la tabla de casos de prueba.
