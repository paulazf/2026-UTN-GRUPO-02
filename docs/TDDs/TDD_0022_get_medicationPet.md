---
id: 0022
estado: Por implementar
autor: Matias Yael Cortes
fecha: 08-10-2026
titulo: Consulta de Medicamentos de Mascota
---

# TDD-0022: Consulta de Medicamentos de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El tutor necesita visualizar el listado de tratamientos farmacológicos vigentes de la mascota para cumplir correctamente con las pautas horarias de administración, verificar dosis y revisar observaciones clínicas previas.
- **Resultado esperado:** Proveer endpoints para consultar los medicamentos asociados a una mascota (`MedicationPet`) con sus respectivas frecuencias, dosis, fecha de inicio y notas, permitiendo poblar el listado en la pestaña correspondiente del perfil de la mascota.

### User Persona
- **Dueño de mascota (Owner):** Usuario que consulta los medicamentos activos de su mascota para recordar pautas de administración o preparar una visita veterinaria.

### User Story
**Como** dueño de una mascota, **quiero** consultar la lista de medicamentos recetados a mi mascota con sus frecuencias, dosis y notas, **para que** pueda hacer un seguimiento preciso de las tomas diarias y tratamientos en curso.

### Criterios de Aceptación
- **Escenario de éxito (Listado por mascota):**
  - Al consultar `GET /api/v1/medication-pets/?idPet={id}` con el ID de una mascota activa del usuario, el sistema devuelve la lista de tratamientos activos (`isDeleted = false`), ordenados por `startDate` descendente, con código `200 OK`. Cada elemento incluye la frecuencia, dosis, fecha de inicio y notas. Si no posee tratamientos, devuelve `[]`.
- **Escenario de éxito (Detalle de tratamiento):**
  - Al consultar `GET /api/v1/medication-pets/{id}/`, devuelve la información completa del registro clínico.
- **Escenario de fallo (Mascota inexistente o ajena):**
  - Si el `idPet` del filtro no existe, está eliminado o pertenece a otro usuario, el sistema devuelve `404 Not Found`.
- **Escenario de fallo (Parámetros inválidos):**
  - Si `idPet` no es un número entero válido, devuelve `400 Bad Request`.

### Reglas de Negocio
- Nunca se retornan registros marcados como eliminados (`isDeleted = true`).
- Un usuario solo tiene acceso a los tratamientos de sus propias mascotas activas.
- El orden por defecto es cronológico inverso (`startDate` más reciente primero).

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `MedicationPet` (TDD-0021):** Modelo y relaciones base en la base de datos.
2. **Autenticación (TDD-0001):** Para filtrar los registros por el dueño autenticado.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - `get_queryset()` con filtros y serialización en ViewSet: *1 SP*
  - Integración en frontend (Listado y renderizado en la pestaña de la mascota): *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

#### 1. Listado por Mascota

- **Endpoint:** `GET /api/v1/medication-pets/`
- **Query params:**

| Parámetro | Tipo | Obligatorio | Descripción / Uso en la App |
| --- | --- | --- | --- |
| `idPet` | INT | Sí | Filtra los medicamentos por la mascota seleccionada. |

##### Response Body (`200 OK`)

```json
[
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
]
```

#### 2. Detalle

- **Endpoint:** `GET /api/v1/medication-pets/{id}/`
- **Response Body (`200 OK`):** Mismo objeto individual del listado.

---

## Arquitectura y Flujo (Cliente-Servidor / Expo Mobile)

1. **Cliente (React Native + Expo Go + NativeWind):**
   - Al ingresar al perfil de la mascota, el usuario accede a la pestaña de medicamentos.
   - La pantalla ejecuta `GET /api/v1/medication-pets/?idPet={id}` para poblar el listado.
2. **Servidor (Django REST Framework):**
   - Filtra el queryset garantizando que `pet__owner = request.user` y `isDeleted = False`.
3. **Respuesta:**
   - Devuelve `200 OK` con el listado JSON.

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Listado con registros** | `idPet` válido con tratamientos activos. | `200 OK` |
| **Listado sin registros** | Mascota sin medicamentos activos. Devuelve `[]`. | `200 OK` |
| **Mascota de otro dueño** | `idPet` ajeno al usuario autenticado. | `404 Not Found` |
| **Parámetro idPet inválido** | `idPet` con formato no numérico. | `400 Bad Request` |
| **Detalle inexistente / eliminado** | ID que no existe o con `isDeleted = true`. | `404 Not Found` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica en ViewSet (Backend):** Implementar acciones `list` y `retrieve` con filtros por mascota.
2. **Etapa 2 - Integración en Frontend Móvil:** Crear servicio `getMedicationPets` y renderizar tarjetas en la app.