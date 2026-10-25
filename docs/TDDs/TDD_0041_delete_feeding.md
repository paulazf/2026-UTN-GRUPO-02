---
id: 0041
estado: Por implementar
autor: Angeles Schneeberger
fecha: 25-10-2026
titulo: Baja de Alimentación de Mascota
---

# TDD-0041: Baja de Alimentación de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El tutor puede haber registrado por error una pauta alimenticia duplicada, haber cargado una dieta cancelada por el veterinario o simplemente desear remover registros desactualizados para mantener clara la rutina diaria de la mascota.
- **Resultado esperado:** Permitir la eliminación lógica (`isDeleted = true`) de un registro de alimentación (`Feeding`) desde la aplicación móvil, excluyéndolo de las consultas activas pero preservando el histórico y la integridad referencial en la base de datos PostgreSQL.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario que gestiona el perfil y la libreta sanitaria de su mascota y desea mantener limpia su lista de alimentos activos.

### User Story
**Como** dueño de una mascota (`Owner`), **quiero** dar de baja una pauta de alimentación de mi mascota, **para que** no figure más en su ficha activa ni genere confusiones al momento de alimentarla.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el registro existe, se encuentra activo (`isDeleted = false`) y pertenece a una mascota activa del usuario autenticado, el sistema establece `isDeleted = true` en la base de datos y devuelve `204 No Content`.
- **Escenario de fallo (Registro no encontrado):**
  - Si el `{id}` no existe en la base de datos, el sistema responde `404 Not Found`.
- **Escenario de fallo (Registro ya eliminado previamente):**
  - Si el `{id}` corresponde a una alimentación que ya posee `isDeleted = true`, el sistema responde `404 Not Found`.

### Reglas de Negocio
- **Estrategia de Persistencia (Soft Delete):** Nunca se ejecuta un `DELETE` físico en la tabla SQL `feeding`. Se realiza un `UPDATE` del campo `isDeleted = True`.
- **Independencia de registros:** La eliminación de una pauta de alimentación no impacta sobre el registro principal de la mascota (`Pet`) ni sobre otros tratamientos médicos (vacunas, medicaciones o estudios).

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Feeding` (TDD-0038):** Modelo con atributo `isDeleted` implementado.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - Método `destroy` / `perform_destroy` con soft delete en `FeedingViewSet` y tests: *0.5 SP*
  - Diálogo modal de confirmación en la aplicación móvil Expo: *0.5 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `DELETE /api/v1/feedings/{id}/`
- **Path Parameter:** `id` (entero): Identificador del registro a eliminar.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** No requiere body.

#### Response Body (`204 No Content`)

*(Cuerpo de respuesta vacío)*

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - El tutor presiona el ícono o botón de "Eliminar" en la tarjeta de alimentación.
   - Al confirmar, el cliente hace la petición HTTP `DELETE /api/v1/feedings/{id}/` con el token Bearer del usuario.
2. **Servidor (Django REST Framework)**:
   - `FeedingViewSet` busca el registro dentro del queryset filtrado por las mascotas activas del dueño (`isDeleted=False`).
   - Si no lo encuentra, arroja `Http404` (`404 Not Found`).
   - Si existe, ejecuta el borrado lógico.
3. **Respuesta**:
   - El servidor devuelve `204 No Content`.

---

## Casos de Borde y Errores

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| :--- | :--- | :--- |
| **Identificador inexistente** | El `{id}` no figura en la base de datos. | `404 Not Found` |
| **Registro previamente eliminado** | El registro ya cuenta con `isDeleted = true`. | `404 Not Found` |
| **Error interno** | Falla de conexión a base de datos durante el commit. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica de Baja Lógica (Backend):**
   - Sobrescribir `perform_destroy` en `FeedingViewSet` para asignar `isDeleted = True` y persistir la entidad.
2. **Etapa 2 - Integración en Frontend Expo:**
   - Crear el método `deleteFeeding(id)` en `Frontend/src/services/api.ts`.
   - Incorporar el modal de confirmación de eliminación en la tarjeta de alimentación y actualizar el estado visual de la lista.