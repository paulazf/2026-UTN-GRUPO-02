---
id: 0035
estado: Por implementar
autor: Matias Yael Cortes
fecha: 24-10-2026
titulo: Consulta de Turnos de Mascota
---

# TDD-0035: Consulta de Turnos de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El tutor necesita consultar las citas veterinarias programadas y pasadas de su mascota para organizar sus tiempos, recordar las direcciones y contactar al veterinario correspondiente.
- **Resultado esperado:** Proveer endpoints para listar y detallar los turnos de una mascota (`Appointment`) con su información completa, incluyendo los datos del domicilio (`Address`) asociado.

### User Persona
- **Dueño de mascota (Owner):** Usuario que revisa las citas médicas desde la pestaña de turnos del perfil de su animal.

### User Story
**Como** dueño de una mascota, **quiero** consultar la lista de turnos de mi mascota con sus fechas, horas, veterinarios y direcciones, **para que** pueda tener organizada la atención médica de mi animal.

### Criterios de Aceptación
- **Escenario de éxito (Listado por mascota):**
  - Al consultar `GET /api/v1/appointments/?idPet={id}` con el ID de una mascota activa del usuario, devuelve la lista de turnos activos (`isDeleted = false`), ordenados por fecha y hora ascendente (`date`, `time`), con código `200 OK`. Si no tiene turnos, devuelve `[]`.
- **Escenario de éxito (Detalle de turno):**
  - Al consultar `GET /api/v1/appointments/{id}/`, devuelve la información completa del turno y el detalle expandido del domicilio.
- **Escenario de fallo (Mascota ajena o inexistente):**
  - Si el `idPet` no existe o no pertenece al usuario autenticado, devuelve `404 Not Found`.
- **Escenario de fallo (Falta `idPet` en listado):**
  - Si no se envía el parámetro `idPet`, devuelve `400 Bad Request`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Appointment` (TDD-0034):** Registros existentes en base de datos.
2. **Autenticación (TDD-0001):** Validación de pertenencia.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Endpoint de listado y detalle con serialización de domicilio: *1 SP*
  - Vista frontend con listado, estados de carga y tarjetas de turno: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `GET /api/v1/appointments/?idPet={id}`
- **Response (`200 OK`):**

```json
[
  {
    "id": 1,
    "idPet": 1,
    "petName": "Milo",
    "description": "Control anual de vacunas",
    "veterinarian": "Dra. Silvina Gómez",
    "date": "2026-11-15",
    "time": "16:30:00",
    "idAddress": 3,
    "address": {
      "idAddress": 3,
      "referenceName": "Veterinaria San Roque",
      "street": "Av. Corrientes",
      "number": "1234",
      "floor": 3,
      "apartment": "B",
      "cityName": "Palermo",
      "provinceName": "Ciudad Autónoma de Buenos Aires"
    },
    "isDeleted": false
  }
]
```

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Consulta exitosa con resultados** | Devuelve turnos ordenados por `date, time`. | `200 OK` |
| **Mascota sin turnos** | Devuelve array vacío `[]`. | `200 OK` |
| **Falta parámetro `idPet`** | Petición sin `idPet`. | `400 Bad Request` |
| **Mascota ajena** | ID perteneciente a otro usuario. | `404 Not Found` |

