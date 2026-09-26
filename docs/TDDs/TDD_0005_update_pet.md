---
id: 0005
estado: Por implementar
autor: Angeles Schneeberger
fecha: 25-09-2026
titulo: Actualización de Mascota
---

# TDD-0005: Actualización de Mascota

## Contexto de Negocio (PRD)

### Objetivo

- **Problema que resuelve:** La información física y de perfil de una mascota varía a lo largo de su vida (cambios en el peso tras revisiones veterinarias, castración, actualización de foto) o puede requerir correcciones en el nombre o la fecha de nacimiento.
- **Resultado esperado:** Permitir que el dueño (`Owner`) actualice los datos de su mascota registrada desde la aplicación móvil, garantizando que su libreta sanitaria e historia clínica digital reflejen siempre su estado actual.

### User Persona

- **Dueño / Tutor (`Owner`):** Usuario de la aplicación móvil que necesita actualizar la información de su mascota de forma rápida y sencilla desde su celular.

### User Story

**Como** dueño de una mascota (`Owner`), **quiero** modificar los datos de mi mascota registrada, **para que** la información de su perfil y libreta sanitaria se mantenga actualizada.

### Criterios de Aceptación

- **Escenario de éxito:**
  - Si el usuario modifica los datos permitidos (`name`, `birthDate`, `neutered`, `weight`, `photo`, `idBreed`), el sistema debe guardar los cambios en la base de datos. La edad (`age`) se calculará automáticamente al vuelo al devolver la respuesta.
- **Escenario de fallo (Datos obligatorios faltantes):**
  - Si el usuario intenta guardar la edición omitiendo o dejando vacíos campos requeridos (`name`, `birthDate`, `neutered`, `weight`, `idBreed`), el sistema debe impedir la actualización.
- **Escenario de fallo (Mascota inexistente o dada de baja):**
  - Si el usuario intenta modificar una mascota que no existe o cuyo estado es `isDeleted = true`, el sistema debe rechazar la operación indicando que el recurso no fue encontrado.
- **Escenario de fallo (Peso inválido):**
  - Si el usuario ingresa un peso (`weight`) menor o igual a `0` o mayor a `150.00` kg, el sistema debe mostrar un error de validación (`400 Bad Request`).
- **Escenario de fallo (Fecha de nacimiento futura):**
  - Si el usuario ingresa una fecha de nacimiento (`birthDate`) posterior a la fecha actual, el sistema debe mostrar un error de validación.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas

1. **TDD-0004 (Alta de Mascota):** Modelo `Pet` y `Breed` creados y migrados en PostgreSQL utilizando la arquitectura de tabla única con clave foránea.

### Estimación

- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose estimado:**
  - Implementación del método `update()` en `PetSerializer` y reglas de validación en Backend: *1 SP*
  - Endpoints `PUT / PATCH /api/v1/pets/{id}/` y acción en `PetViewSet`: *1 SP*
  - Pantalla de edición en Expo (`EditPetScreen`) conectada a la API: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

La operación utiliza el modelo unificado existente en `Backend/api/models.py`. Los campos permitidos para modificación son:

- **En `Pet`:**
  - `name`: Editable (`CharField`).
  - `birthDate`: Editable (`DateField`).
  - `neutered`: Editable (`BooleanField`).
  - `weight`: Editable (`DecimalField`).
  - `photo`: Editable (`URLField`, nullable).
  - `breed`: Editable (`ForeignKey` a `Breed`).

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `PUT /api/v1/pets/{id}/` 
- **Path Parameter:** `id`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Milo",
  "birthDate": "2023-05-14",
  "neutered": true,
  "weight": 13.80,
  "photo": "https://storage.example.com/pets/milo-updated.jpg",
  "idBreed": 2
}
```

#### Response Body (`200 Ok`) 

```json
{
  "id": 1,
  "name": "Milo",
  "birtdate": "2023-05-14",
  "age": 3,
  "neutered": true,
  "weight": "13.80",
  "photo": "https://storage.example.com/pets/milo-updated.jpg",
  "breed": {
      "id": 2,
      "name": "Labrador",
      "species": "DOG"
  },
  "isDeleted": false,
  "idOwner": 1,
  "updated_at": "2026-09-25T13:00:00Z"
}
```
## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go):** La pantalla de edición de mascota carga los datos actuales en el formulario (obteniendo el catálogo de razas dinámicamente si el usuario cambia la especie visual), permite modificarlos y envía `PUT /api/v1/pets/{id}/`.
2. **Servidor (Django REST Framework):**
   - `PetViewSet` busca la mascota activa (`id=pk`, `isDeleted=False`) asociada al usuario autenticado. Si no existe o ya está dada de baja, retorna `404 Not Found`.
   - `PetSerializer` valida los datos modificados (campos requeridos, formato URL de la foto, fecha no futura, peso mayor a cero y existencia de la Foreign Key `idBreed`).
   - En el método `update()`, se persisten los cambios directamente en la tabla unificada `Pet`. Al devolver la respuesta, el serializador lee la propiedad `age` del modelo, retornando la edad actualizada automáticamente.
3. **Respuesta:** El servidor devuelve `200 OK` con el objeto serializado de la mascota actualizada; el cliente muestra el mensaje de confirmación y refresca el estado en el perfil de la mascota.

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Datos obligatorios vacíos** | Los campos `name`, `birthDate`, `neutered`, `weight` y `idBreed` no pueden ser nulos ni vacíos en un `PUT`. | `400 Bad Request` |
| **Nombre inválido** | `name` no puede contener únicamente espacios en blanco ni superar los 100 caracteres. | `400 Bad Request` |
| **Peso inválido** | `weight` debe ser mayor a 0 y menor o igual a 150.00 kg. | `400 Bad Request` |
| **Fecha de nacimiento futura** | `birthDate` no puede ser posterior a la fecha actual del servidor (`today`). | `400 Bad Request` |
| **Raza inexistente** | Si el `idBreed` enviado no existe en la tabla `Breed`. | `400 Bad Request` |
| **Mascota inexistente o eliminada** | Cuando el `id` no existe en la base de datos o la mascota tiene `isDeleted = true`. | `404 Not Found` |
| **Conflicto por duplicidad** | Al modificar datos, los nuevos valores de `name`, `idBreed` y `birthDate` coinciden con otra mascota activa del mismo dueño. | `409 Conflict` |
| **Error de Infraestructura** | Falla de conexión con PostgreSQL durante la persistencia en la tabla `Pet`. | `500 Internal Server Error` |

## Plan de Implementación

1. **Etapa 1 - Serializer y Lógica de Negocio (Backend):**
   - Implementar las validaciones y permitir el flujo de actualización en `PetSerializer` (`Backend/api/serializers.py`).
2. **Etapa 2 - Vista y Rutas (Backend):**
   - Habilitar los métodos `PUT` y `PATCH` en `PetViewSet` (`Backend/api/views.py`), sobrescribiendo el `get_queryset()` para filtrar siempre por `isDeleted = False` y por el `Owner` autenticado.
3. **Etapa 3 - Integración Móvil (Frontend Expo):**
   - Implementar la función de consumo HTTP (`PUT /api/v1/pets/{id}/`) en `Frontend/src/services/api.ts`.
   - Desarrollar la pantalla `EditPetScreen` precargando los datos actuales en los selectores y conectándola al botón "Editar" del perfil de la mascota.