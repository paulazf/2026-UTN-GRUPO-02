---
id: 0040
estado: Por implementar
autor: Angeles Schneeberger
fecha: 25-10-2026
titulo: Modificación de Alimentación de Mascota
---

# TDD-0040: Modificación de Alimentación de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** A lo largo de la vida de la mascota, las indicaciones de alimentación cambian o el tutor puede haber tipeado de forma incorrecta una fecha, porción o nota.
- **Resultado esperado:** Permitir que el dueño (`Owner`) modifique los datos de una pauta de alimentación (`Feeding`) existente y activa desde la app móvil mediante una petición de actualización completa (`PUT`), garantizando la consistencia de los datos y manteniendo inmutable la mascota asignada.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario registrado que necesita corregir o actualizar la pauta alimentaria de su mascota desde su dispositivo móvil.

### User Story
**Como** dueño de una mascota (`Owner`), **quiero** modificar los datos de una pauta de alimentación registrada, **para que** la porción, frecuencia, tipo de comida y observaciones reflejen la rutina nutricional vigente de mi animal.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el registro existe, está activo (`isDeleted = false`), pertenece a una mascota del usuario autenticado y los datos enviados son válidos (`food`, `type`, `portion`, `sinceDate`, `frequency`), el sistema actualiza el registro en la base de datos y devuelve `200 OK` con el objeto actualizado.
- **Escenario de fallo (Registro inexistente o ajeno):**
  - Si el `{id}` no existe en la base de datos, tiene `isDeleted = true` o pertenece a una mascota de otro tutor, devuelve `404 Not Found`.
- **Escenario de fallo (Reasignación de Mascota prohibida):**
  - Si el payload incluye un `idPet` diferente al actualmente asociado a la alimentación, el sistema rechaza la operación con `400 Bad Request` indicando que una pauta alimentaria no puede ser reasignada a otra mascota.
- **Escenario de fallo (Datos obligatorios vacíos o inválidos):**
  - Si se intenta guardar omitiendo o dejando en blanco un campo obligatorio (`food`, `type`, `sinceDate`) o se envía un `type` fuera de catálogo, devuelve `400 Bad Request`.
- **Escenario de fallo (Fecha de inicio futura):**
  - Si la nueva `sinceDate` es posterior a la fecha actual (`today`), devuelve `400 Bad Request`.

### Reglas de Negocio
- **Inmutabilidad de la mascota (`idPet`):** La relación con `Pet` es fija. Si se necesita registrar un alimento para otro animal, se debe crear un registro nuevo mediante el alta correspondiente (TDD-0038).
- **Campos modificables:** `food`, `type`, `portion`, `sinceDate`, `frequency` y `notes`.
- **Reemplazo completo (`PUT`):** El cliente envía el formulario con todos los campos editables consolidados.
- **Timestamp de actualización:** Cada edición actualiza automáticamente el campo `updated_at`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Feeding` (TDD-0038):** Modelo existente.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Método `update` en `FeedingSerializer` y vista (`PUT /api/v1/feedings/{id}/`): *1 SP*
  - Modal de edición en frontend Expo conectado a la API: *1 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `PUT /api/v1/feedings/{id}/`
- **Path Parameter:** `id` (entero): Identificador de la pauta de alimentación.
- **Content-Type:** `application/json`
- **Headers:** `Authorization: Bearer <token>`

#### Request Body (JSON)

```json
{
  "food": "Royal Canin Mini Adult - Croqueta fina",
  "type": "DRY_FOOD",
  "portion": "140g al día",
  "sinceDate": "2026-06-01",
  "frequency": "2 tomas de 70g (mañana y noche)",
  "notes": "Aumentar hidratación en los meses de verano."
}
```

#### Response Body (`200 OK`)

```json
{
  "idFeeding": 1,
  "idPet": 1,
  "food": "Royal Canin Mini Adult - Croqueta fina",
  "type": "DRY_FOOD",
  "typeDisplay": "Alimento seco",
  "portion": "140g al día",
  "sinceDate": "2026-06-01",
  "frequency": "2 tomas de 70g (mañana y noche)",
  "notes": "Aumentar hidratación en los meses de verano.",
  "isDeleted": false,
  "created_at": "2026-05-10T12:00:00Z",
  "updated_at": "2026-10-25T11:15:00Z"
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - Desde la tarjeta de alimentación en la app, el usuario toca "Editar".
   - Se abre el modal con los valores precargados en el formulario.
   - Al tocar "Guardar cambios", la app realiza la petición `PUT /api/v1/feedings/{id}/` con el cuerpo completo y el token de sesión.
2. **Servidor (Django REST Framework)**:
   - `FeedingViewSet` recupera la instancia asegurando que pertenezca al queryset autorizado (`isDeleted=False`, mascota activa del tutor).
   - El serializer valida que los campos requeridos estén completos, que no se intente alterar `idPet`, que `sinceDate` no sea futura y que `type` pertenezca al catálogo permitido.
   - Se persisten los cambios y se actualiza `updated_at`.
3. **Respuesta**:
   - Devuelve `200 OK` con el objeto actualizado.
   - La app móvil actualiza la lista local y cierra el modal.

---

## Casos de Borde y Errores

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| :--- | :--- | :--- |
| **Pauta inexistente o ajena** | El `{id}` no existe en la base de datos, tiene `isDeleted = true` o la mascota pertenece a otro tutor. | `404 Not Found` |
| **Intento de reasignar mascota** | El payload incluye un `idPet` diferente al registro original. | `400 Bad Request` |
| **Campos obligatorios vacíos** | Falta algún campo requerido (`food`, `type`, `sinceDate`). | `400 Bad Request` |
| **Tipo de alimento no válido** | Se envía un `type` no existente en `FeedingType`. | `400 Bad Request` |
| **Fecha de inicio futura** | `sinceDate` es mayor a la fecha actual del servidor (`today`). | `400 Bad Request` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica de Actualización en Backend:**
   - Incorporar validaciones de actualización y bloqueo de `idPet` en `FeedingSerializer`.
   - Implementar el método `update` en `FeedingViewSet`.
2. **Etapa 2 - Pruebas Automatizadas:**
   - Test unitario de actualización completa vía `PUT`.
   - Test de rechazo de fechas futuras y tipos inválidos.
   - Test de aislamiento de permisos (intento de modificar registros de otros tutores devuelve 404).
3. **Etapa 3 - Integración en Frontend Expo:**
   - Implementar `updateFeeding(id, payload)` en `Frontend/src/services/api.ts`.
   - Conectar el formulario modal de edición al endpoint `PUT`.