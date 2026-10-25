---
id: 0039
estado: Por implementar
autor: Angeles Schneeberger
fecha: 25-10-2026
titulo: Consulta de Alimentación de Mascota
---

# TDD-0039: Consulta de Alimentación de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores necesitan revisar rápidamente la dieta de sus mascotas, verificar la porción exacta antes de servir la comida o corroborar qué alimento y frecuencia recomendó el veterinario, así como consultar antecedentes alimentarios si se realizaron cambios nutricionales.
- **Resultado esperado:** Exponer el listado de pautas de alimentación activas de una mascota, garantizando que el usuario solo acceda a los registros de sus propias mascotas.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario que consulta la libreta nutricional de sus mascotas desde su dispositivo móvil.

### User Story
**Como** dueño de una mascota (`Owner`), **quiero** consultar las pautas de alimentación registradas para mi mascota, **para que** pueda verificar su dieta actual, tamaño de porción, frecuencia y recomendaciones especiales en cualquier momento.

### Criterios de Aceptación
- **Escenario de éxito (Listado por Mascota):**
  - La petición `GET /api/v1/feedings/?idPet={id}` con un `idPet` válido perteneciente a una mascota activa del usuario devuelve la lista de registros de alimentación activos (`isDeleted = false`), ordenados cronológicamente por `sinceDate` descendente, con código `200 OK`. Si la mascota no tiene registros asociados, devuelve una lista vacía `[]`.
- **Escenario de éxito (Consulta de Detalle):**
  - La petición `GET /api/v1/feedings/{id}/` devuelve la información completa del registro solicitado con código `200 OK`.
- **Escenario de fallo (Mascota inexistente o ajena):**
  - Si el `idPet` proporcionado no existe en la base de datos, tiene `isDeleted = true` o pertenece a otro usuario, el sistema responde `404 Not Found`.
- **Escenario de fallo (Detalle inexistente, eliminado o ajeno):**
  - Si el `{id}` del registro de alimentación no existe, tiene `isDeleted = true` o está asociado a una mascota ajena, devuelve `404 Not Found`.

### Reglas de Negocio
- **Filtrado estricto por baja lógica:** Nunca se deben retornar registros de alimentación con `isDeleted = true`, ni registros pertenecientes a mascotas que hayan sido dadas de baja (`pet.isDeleted = true`).
- **Aislamiento por tutor:** Un tutor autenticado solo puede consultar registros de alimentación de las mascotas activas que le pertenecen (`active_pets(request)`).
- **Orden por defecto:** Los registros se devuelven ordenados por `sinceDate` descendente (la dieta más reciente primero).

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Feeding` (TDD-0038):** Modelo persistido en PostgreSQL.
2. **Entidad `Pet` (TDD-0004) y Autenticación (TDD-0001):** Validación de identidad del tutor y mascotas activas asociadas.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Configuración de filtros, `get_queryset()` seguro y detalle en `FeedingViewSet`: *1 SP*
  - Integración en frontend (pantalla/tab "Alimentación" de la mascota): *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework ↔ Expo Mobile)

#### 1. Listado de Alimentaciones por Mascota
- **Endpoint:** `GET /api/v1/feedings/?idPet={id}`
- **Query Params:**
  - `idPet` (Obligatorio, entero): ID de la mascota.
  - `type` (Opcional, string): Filtro por tipo (`DRY_FOOD`, `WET_FOOD`, `VETERINARY_DIET`, `HOMEMADE`, `MIXED`).
- **Headers:** `Authorization: Bearer <token>`

##### Response Body (`200 OK`)

```json
[
  {
    "idFeeding": 2,
    "idPet": 1,
    "food": "Royal Canin Gastrointestinal",
    "type": "VETERINARY_DIET",
    "typeDisplay": "Dieta veterinaria",
    "portion": "100g al día",
    "sinceDate": "2026-10-01",
    "frequency": "2 veces al día (mañana y tarde)",
    "notes": "Prescripto por episodio de gastritis transitoria.",
    "isDeleted": false,
    "created_at": "2026-10-01T09:30:00Z",
    "updated_at": "2026-10-01T09:30:00Z"
  },
  {
    "idFeeding": 1,
    "idPet": 1,
    "food": "Royal Canin Mini Adult",
    "type": "DRY_FOOD",
    "typeDisplay": "Alimento seco",
    "portion": "120g al día",
    "sinceDate": "2026-05-10",
    "frequency": "2 veces al día",
    "notes": "Ración habitual.",
    "isDeleted": false,
    "created_at": "2026-05-10T12:00:00Z",
    "updated_at": "2026-05-10T12:00:00Z"
  }
]
```

#### 2. Detalle de Alimentación
- **Endpoint:** `GET /api/v1/feedings/{id}/`
- **Path Parameter:** `id` (entero): Identificador del registro.
- **Headers:** `Authorization: Bearer <token>`

##### Response Body (`200 OK`)

```json
{
  "idFeeding": 2,
  "idPet": 1,
  "food": "Royal Canin Gastrointestinal",
  "type": "VETERINARY_DIET",
  "typeDisplay": "Dieta veterinaria",
  "portion": "100g al día",
  "sinceDate": "2026-10-01",
  "frequency": "2 veces al día (mañana y tarde)",
  "notes": "Prescripto por episodio de gastritis transitoria.",
  "isDeleted": false,
  "created_at": "2026-10-01T09:30:00Z",
  "updated_at": "2026-10-01T09:30:00Z"
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - Al ingresar a la vista de detalle de la mascota, el cliente renderiza la pestaña "Alimentación" y despacha la consulta `GET /api/v1/feedings/?idPet={id}`.
2. **Servidor (Django REST Framework)**:
   - `FeedingViewSet.get_queryset()` intercepta la petición y:
     - Extrae el usuario autenticado (`request.user`).
     - Obtiene la lista de mascotas activas del dueño (`pet__in=active_pets(request)`).
     - Aplica el filtro `isDeleted = False` y `pet__isDeleted = False`.
     - Si se envía `idPet`, valida que exista y pertenezca a sus mascotas; en caso contrario responde `404 Not Found`.
3. **Respuesta**:
   - Devuelve `200 OK` con la colección de elementos serializados o el objeto único en la consulta de detalle.

---

## Casos de Borde y Errores

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| :--- | :--- | :--- |
| **`idPet` no numérico** | El parámetro de consulta `idPet` no es un entero válido. | `400 Bad Request` |
| **Mascota ajena o dada de baja** | El `idPet` pertenece a otro usuario o posee `isDeleted = true`. | `404 Not Found` |
| **Pauta inexistente o ajena** | En `GET /api/v1/feedings/{id}/`, el `{id}` no existe, tiene `isDeleted = true` o es de otra mascota. | `404 Not Found` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica de Consulta y Filtros (Backend):**
   - Configurar en `FeedingViewSet` el método `get_queryset()` con validación de seguridad de tutor y parámetros query.
   - Agregar filtros por `idPet`.
3. **Etapa 2 - Visualización Móvil (Frontend Expo):**
   - Implementar la función `getFeedingsByPetId(petId)` en `Frontend/src/services/api.ts`.