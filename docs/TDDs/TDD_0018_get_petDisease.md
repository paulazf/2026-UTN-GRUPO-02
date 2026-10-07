---
id: 0018
estado: Por implementar
autor: Paula Zacarías
fecha: 07-10-2026
titulo: Consulta de Enfermedades de Mascota
---

# TDD-0018: Consulta de Enfermedades de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Para que el registro clínico sea útil, el dueño y el veterinario necesitan visualizar el historial de patologías pasadas y activas de la mascota de forma ordenada y clara, incluyendo las fechas de diagnóstico, períodos de recuperación y notas u observaciones clínicas.
- **Resultado esperado:** Proveer endpoints para listar las enfermedades asociadas a una mascota (`PetDisease`) con sus detalles (incluyendo el campo `notes`), permitiendo poblar el listado de la pestaña "Enfermedades" del perfil de la mascota y filtrar por estado (enfermedades activas en curso vs. históricas/superadas).

### User Persona
- **Dueño de mascota (Owner):** Usuario que consulta las enfermedades de su mascota antes de una consulta veterinaria o para recordar tratamientos y observaciones previas.

### User Story
**Como** dueño de una mascota, **quiero** consultar la lista de enfermedades registradas en el perfil de mi mascota con sus fechas y notas, **para que** pueda hacer seguimiento de sus afecciones actuales y revisar su historial patológico completo.

### Criterios de Aceptación
- **Escenario de éxito (Listado por mascota con estado calculado):**
  - Al consultar `GET /api/v1/pet-diseases/?idPet={id}` con el ID de una mascota activa del usuario, el sistema devuelve la lista de enfermedades con `isDeleted = false`, ordenadas por `startDate` descendente, con código `200 OK`. Cada elemento incluye las fechas, el campo `notes` y el campo calculado `status` (`IN_PROGRESS` o `RESOLVED`). Si no posee enfermedades registradas, devuelve una lista vacía `[]`.
- **Escenario de éxito (Historial general de salud):**
  - Al consultar `GET /api/v1/pet-diseases/` sin especificar `idPet`, el sistema devuelve las enfermedades activas de **todas** las mascotas del usuario autenticado, incluyendo `petName`, `diseaseName` y `notes`.
- **Escenario de éxito (Filtro por afecciones activas):**
  - Al consultar `GET /api/v1/pet-diseases/?idPet={id}&active=true`, el sistema devuelve únicamente las enfermedades que continúan en curso (`endDate` nulo).
- **Escenario de éxito (Detalle de registro):**
  - Al consultar `GET /api/v1/pet-diseases/{id}/`, devuelve la información completa del registro clínico, incluyendo `notes`.
- **Escenario de fallo (Mascota inexistente o ajena):**
  - Si el `idPet` del filtro no existe, está eliminado o pertenece a otro usuario, el sistema devuelve `404 Not Found`.
- **Escenario de fallo (Parámetros inválidos):**
  - Si `idPet` no es un número entero válido, devuelve `400 Bad Request`.

### Reglas de Negocio
- Nunca se retornan registros marcados como eliminados (`isDeleted = true`).
- Un usuario solo tiene acceso a las historias clínicas de sus propias mascotas activas.
- El orden por defecto es cronológico inverso (fecha de inicio `startDate` más reciente primero).
- Una enfermedad se considera "Activa / En curso" si `endDate` es `null`, y "Superada / Histórica" si posee una fecha `endDate` registrada.
- El campo `notes` se entrega como texto o `null`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `PetDisease` (TDD-0017):** Modelo y relaciones base en base de datos.
2. **Autenticación (TDD-0001):** Para filtrar los registros por el dueño autenticado.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
- **Desglose:**
  - `get_queryset()` con filtros, serialización de campo calculado `status` en ViewSet: *1 SP*
  - Integración en frontend (Lista y renderizado dinámico de Badges en pestaña "Enfermedades"): *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

#### 1. Listado Completo

- **Endpoint:** `GET /api/v1/pet-diseases/`
- **Query params:**

| Parámetro | Tipo | Obligatorio | Descripción / Uso en la App |
| --- | --- | --- | --- |
| `idPet` | INT | No | Filtra por la mascota seleccionada (pestaña "Enfermedades"). Si se omite, lista las de todas las mascotas del usuario. |
| `active` | BOOLEAN | No | Si es `true`, devuelve únicamente las enfermedades sin fecha de fin (`endDate` nulo). |

#### Response Body (`200 OK`)

```json
[
  {
    "id": 12,
    "idPet": 1,
    "petName": "Milo",
    "idDisease": 5,
    "diseaseName": "Otitis Externa",
    "startDate": "2026-08-01",
    "endDate": null,
    "notes": "Tratamiento con gotas óticas cada 12 horas. Control en 10 días.",
    "isDeleted": false,
  },
  {
    "id": 4,
    "idPet": 1,
    "petName": "Milo",
    "idDisease": 1,
    "diseaseName": "Parvovirus",
    "startDate": "2024-03-15",
    "endDate": "2024-04-02",
    "notes": "Internación durante 5 días con fluidoterapia. Alta médica sin secuelas.",
    "isDeleted": false,
  }
]
```

#### 2. Detalle

- **Endpoint:** `GET /api/v1/pet-diseases/{id}/`
- **Response Body (`200 OK`):** Mismo objeto del listado.

---

## Arquitectura y Flujo (Cliente-Servidor / Expo Mobile)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - Al ingresar al **perfil de la mascota**, el usuario navega a la pestaña **"Enfermedades"**.
   - La pantalla ejecuta `GET /api/v1/pet-diseases/?idPet={id}` para poblar el listado.
   - Cada tarjeta de la lista muestra:
     - **Título:** Nombre de la enfermedad (ej. "Otitis Externa").
     - **Badge de estado:**
       - Si `endDate` es nulo: Badge con fondo rojo `"En curso"` o `"Crónica"`.
       - Si `endDate` existe: Badge verde `"Finalizada"` con el período `"15/03/2024 - 02/04/2024"`.
     - **Observaciones:** Texto del campo `notes` (con opción de expandir/contraer si es extenso).
     - Si la lista está vacía, muestra un estado visual amigable (*empty state*): *"No hay enfermedades registradas para esta mascota"*, acompañado por el botón para agregar una.
2. **Servidor (Django REST Framework)**:
   - Filtra el queryset garantizando que `pet__owner = request.user` y `isDeleted = False`.
   - Aplica los filtros de `idPet` y `active` si están presentes en los query parameters.
   - Serializa con `select_related('pet', 'disease')` para optimizar consultas.
3. **Respuesta**:
   - Devuelve `200 OK` con el listado JSON.

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Listado con registros** | `idPet` válido con registros existentes. Incluye campo `notes` en cada elemento. | `200 OK` |
| **Listado sin registros** | Mascota sin patologías. Devuelve `[]`. | `200 OK` |
| **Filtro de activas** | Consulta con `?active=true` solo incluye registros con `endDate = null`. | `200 OK` |
| **Mascota de otro dueño** | `idPet` ajeno al usuario autenticado. | `404 Not Found` |
| **Mascota dada de baja** | `idPet` con `isDeleted = true`. | `404 Not Found` |
| **Detalle inexistente / eliminado** | ID que no existe o con `isDeleted = true`. | `404 Not Found` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica en ViewSet (Backend):**
   - Implementar acciones `list` y `retrieve` en `PetDiseaseViewSet` con soporte de `notes` y filtros.
2. **Etapa 2 - Integración en Frontend Móvil:**
   - Crear función `getPetDiseases` en `Frontend/src/services/api.ts`.
   - Implementar el listado de tarjetas en la pestaña "Enfermedades" del perfil de la mascota.
