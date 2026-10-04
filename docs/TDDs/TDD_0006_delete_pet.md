---
id: 0006
estado: Por implementar
autor: Angeles Schneeberger
fecha: 25-09-2026
titulo: Baja de Mascota
---

# TDD-0006: Baja de Mascota

## Contexto de Negocio (PRD)

### Objetivo

- **Problema que resuelve:** Si una mascota fue registrada por error o ya no convive con el tutor, el usuario necesita retirarla de su panel principal sin perder la información médica histórica (vacunas, medicaciones, enfermedades, estudios y turnos) asociada a ella.
- **Resultado esperado:** Permitir que el dueño (`Owner`) dé de baja una mascota de su lista activa mediante una baja lógica (`isDeleted = true`), retirándola del panel principal de la aplicación móvil y de los recordatorios de salud, pero preservando la integridad de los datos en la base de datos.

### User Persona

- **Dueño / Tutor (`Owner`):** Usuario de la aplicación móvil que desea eliminar una mascota de su listado de mascotas visibles en la aplicación.

### User Story

**Como** dueño de una mascota (`Owner`), **quiero** dar de baja una mascota de mi listado, **para que** deje de aparecer en mi pantalla principal y recordatorios sin perder su historial médico registrado.

### Criterios de Aceptación

- **Escenario de éxito:**
  - Si el usuario confirma la baja de una mascota activa (`isDeleted = false`) perteneciente a su cuenta, el sistema debe actualizar su estado a `isDeleted = true` en la base de datos y excluirla inmediatamente del carrusel de mascotas activas en la app.
- **Escenario de fallo (Mascota inexistente):**
  - Si el usuario intenta dar de baja una mascota cuyo `id` no existe en la base de datos, el sistema debe rechazar la operación.
- **Escenario de fallo (Mascota ya dada de baja):**
  - Si el usuario intenta dar de baja una mascota que ya posee `isDeleted = true`, el sistema debe rechazar la operación.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas

1. **TDD-0004 (Alta de Mascota):** Modelo `Pet` con el atributo booleano `isDeleted` (por defecto `False`) creado y migrado en PostgreSQL.
2. **Consultas de Mascotas Activas:** Los endpoints de listado (`GET /api/v1/pets/`) y detalle deben incluir el filtro `isDeleted = False`.

### Estimación

- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose estimado:**
  - Acción de baja lógica en `PetViewSet` y endpoint `DELETE`: *1 SP*
  - Modal de confirmación y actualización de estado en Expo: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

La operación utiliza el atributo `isDeleted` definido en el modelo unificado `Pet` (`Backend/api/models.py`):

```python
class Pet(models.Model):
    # ... atributos de Pet
    isDeleted = models.BooleanField(default=False)
```

- **Estrategia de Persistencia (Baja Lógica / Soft Delete):** No se ejecuta la sentencia SQL `DELETE` sobre la tabla `pet`. Se realiza un `UPDATE` del campo `isDeleted = True`. De esta manera, se resguardan las claves foráneas de vacunas, turnos, medicaciones, enfermedades y estudios médicos asociados a la mascota.

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `DELETE /api/v1/pets/{id}/`
- **Path Parameter:** `id` 
- **Request Body:** No requiere body.

#### Response Body (`200 OK`)

```json
{
  "message": "La mascota fue dada de baja correctamente.",
  "id": 1,
  "isDeleted": true
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go + NativeWind)**: el usuario presiona "Eliminar mascota" y confirma la acción la app móvil hace `DELETE /api/v1/pets/{id}/` con el token de sesión del `Owner` autenticado.
2. **Servidor (Django REST Framework)**:
   - `PetViewSet` intercepta la acción de borrado en la ruta `DELETE /api/v1/pets/<int:pk>/`.
   - Busca la mascota mediante `Pet.objects.filter(id=pk, isDeleted=False).first()`.
   - Si no existe, devuelve `404 Not Found`.
   - Si existe, asigna `pet.isDeleted = True`.
3. **Respuesta**: el servidor devuelve `200 OK` con el mensaje de confirmación; el cliente quita la mascota de la lista local de "Mis Mascotas" y redirige al panel principal.

---

## Casos de Borde y Errores

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| :--- | :--- | :--- |
| **Mascota inexistente** | Cuando el `id` no existe en la base de datos. | `404 Not Found` |
| **Mascota ya dada de baja** | Cuando se intenta dar de baja una mascota que ya tiene `isDeleted = true`. | `404 Not Found` |
| **Identificador inválido** | Cuando el parámetro `id` en la URL no es un entero positivo. | `400 Bad Request` |
| **Error de Infraestructura** | Falla de conexión con el contenedor de PostgreSQL durante la baja. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Vista y Lógica de Baja (Backend):**
   - Implementar el método `destroy()` en `PetViewSet` en `Backend/api/views.py` para realizar la baja lógica (`pet.isDeleted = True`).
   - Asegurar que las consultas de listado (`GET /api/v1/pets/`) filtren siempre por `isDeleted = False`.
2. **Etapa 2 - Rutas (Backend):**
   - Asegurar que la ruta `DELETE /api/v1/pets/<int:pk>/` esté habilitada en `Backend/core/urls.py`.
3. **Etapa 3 - Integración Móvil (Frontend Expo):**
   - Implementar la función de consumo HTTP (`DELETE /api/v1/pets/{id}/`) en `Frontend/src/services/api.ts`.
   - Agregar el botón de eliminación con modal de confirmación en la app de Expo y actualizar el carrusel de mascotas tras recibir la respuesta exitosa.

---