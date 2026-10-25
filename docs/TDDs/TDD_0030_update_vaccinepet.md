---
id: 0030
estado: Por implementar
autor: Thiago Perez
fecha: 21-10-2026
titulo: Modificación de Vacuna en Mascota
---

# TDD-0030: Modificación de Vacuna en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El dueño puede equivocarse al cargar una aplicación: fecha de aplicación o de vencimiento mal tipeada, número de dosis incorrecto o una nota que quiere agregar.
- **Resultado esperado:** Permitir corregir `doseNumber`, `applicationDate`, `expirationDate` y `notes` de un `VaccinePet` existente, manteniendo la mascota y el producto.

### User Persona
- **Dueño de mascota (Owner):** Usuario que corrige una vacuna o pipeta que ya cargó.

### User Story
**Como** dueño de una mascota, **quiero** corregir los datos de una vacuna que registré, **para que** las fechas de vencimiento y los avisos sean correctos.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si la aplicación existe, está activa, pertenece a una mascota del usuario y los datos son válidos, el sistema la actualiza y devuelve `200 OK` con el estado recalculado.
- **Escenario de fallo (Registro no encontrado):**
  - Si el `idVaccinePet` no existe, está dado de baja o es de una mascota ajena, devuelve `404 Not Found`.
- **Escenario de fallo (Datos inválidos):**
  - Mismas validaciones que el alta (TDD-0028) sobre el estado final: dosis obligatoria si es vacuna, aplicación no futura, vencimiento posterior a la aplicación. Devuelve `400 Bad Request`.
- **Escenario de fallo (Reasignación):**
  - Si el body trae `idPet` o `idVaccine` distintos a los actuales, devuelve `400 Bad Request`. Para cambiar el producto se elimina la aplicación y se registra otra.
- **Escenario de fallo (Duplicado):**
  - Si la nueva `applicationDate` coincide con otra aplicación activa del mismo producto en la misma mascota, devuelve `409 Conflict`.

### Reglas de Negocio
- Se admite `PUT` y `PATCH`, igual que `MedicationPet`.
- Registrar un refuerzo **no** es una modificación: es un alta nueva (TDD-0028). La anterior pasa a `RENEWED` sola.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `VaccinePet` (TDD-0028).**
2. **Consulta (TDD-0029):** `get_queryset()` filtrado por dueño y `isDeleted`.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - `update` / `partial_update`, bloqueo de reasignación y validación sobre el estado final: *1 SP*
  - Control de duplicados excluyendo la instancia y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `PATCH /api/v1/vaccine-pets/{idVaccinePet}/` (o `PUT`)
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "expirationDate": "2027-04-20",
  "notes": "El veterinario indicó refuerzo anual"
}
```

#### Response Body (`200 OK`)

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
  "expirationDate": "2027-04-20",
  "notes": "El veterinario indicó refuerzo anual",
  "status": "VALID",
  "daysToExpiration": 181,
  "isDeleted": false
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - Desde la tarjeta, "Editar" abre el mismo modal del alta con los datos precargados y el producto bloqueado.
   - Envía `PATCH` solo con los campos que cambiaron.
2. **Servidor (Django REST Framework)**:
   - Obtiene la aplicación con el `get_queryset()` de TDD-0029; si no está, `404`.
   - `VaccinePetSerializer.validate`:
     - Si `self.instance` existe y llega `idPet` o `idVaccine` distinto, `400`.
     - Combina datos enviados e instancia y aplica las reglas de dosis y fechas.
     - Busca duplicados excluyendo `pk=instance.pk` (`409`).
   - Guarda los cambios.
3. **Respuesta**:
   - `200 OK` con el estado recalculado.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Cambio de vencimiento** | `PATCH` con `expirationDate` válida. El `status` cambia. | `200 OK` |
| **Cambio de dosis** | `doseNumber = 2`. | `200 OK` |
| **Agregar notas** | `PATCH` con `notes`. | `200 OK` |
| **PUT completo** | Todos los campos válidos, mismos `idPet` e `idVaccine`. | `200 OK` |
| **Mismos idPet e idVaccine en el body** | Se aceptan si no cambian. | `200 OK` |
| **Cambio de mascota** | `idPet` distinto. | `400 Bad Request` |
| **Cambio de producto** | `idVaccine` distinto. | `400 Bad Request` |
| **Vencimiento antes de la aplicación** | Estado final inválido. | `400 Bad Request` |
| **Aplicación futura** | `applicationDate` posterior a hoy. | `400 Bad Request` |
| **Quitar la dosis a una vacuna** | `doseNumber = null` en un producto `VACCINE`. | `400 Bad Request` |
| **Fecha que duplica otra aplicación** | Misma mascota, producto y nueva `applicationDate` ya usada. | `409 Conflict` |
| **ID inexistente, eliminado o ajeno** | | `404 Not Found` |
| **Sin autenticación** | | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Serializer:**
   - En `VaccinePetSerializer.validate`, bloquear reasignación y validar sobre el estado final (instancia + datos enviados).
   - Excluir la instancia en la búsqueda de duplicados.
2. **Etapa 2 - Endpoint:**
   - Habilitar `update` y `partial_update` en `VaccinePetViewSet`.
3. **Etapa 3 - Tests:**
   - Un test por cada fila de la tabla.
