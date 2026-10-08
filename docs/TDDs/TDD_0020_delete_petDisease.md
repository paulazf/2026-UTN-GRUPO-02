---
id: 0020
estado: Por implementar
autor: Paula Zacarías
fecha: 07-10-2026
titulo: Baja Lógica de Enfermedad en Mascota
---

# TDD-0020: Baja Lógica de Enfermedad en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Si un tutor carga por error una enfermedad a la mascota equivocada, duplica involuntariamente una entrada o se determinó clínicamente que el diagnóstico inicial fue erróneo (descarte médico), el usuario debe poder retirar dicho registro del historial clínico sin perder la trazabilidad ni afectar la integridad de la base de datos.
- **Resultado esperado:** Realizar la baja lógica (`isDeleted = true`) de un registro de enfermedad de una mascota (`PetDisease`) mediante una petición `DELETE`, ocultándolo de las consultas normales de la aplicación.

### User Persona
- **Dueño de mascota (Owner):** Usuario que necesita descartar o eliminar una enfermedad cargada por equivocación en la historia clínica de su mascota.

### User Story
**Como** dueño de una mascota, **quiero** eliminar una enfermedad registrada por equivocación, **para que** el historial clínico de mi mascota contenga únicamente diagnósticos certeros.

### Criterios de Aceptación
- **Escenario de éxito (Baja lógica exitosa):**
  - Si el registro existe, pertenece a una mascota activa del usuario y no está eliminado (`isDeleted = false`), el sistema actualiza el flag a `isDeleted = true` y devuelve `204 No Content`.
- **Escenario de fallo (Registro no encontrado o ajeno):**
  - Si el `id` especificado en la URL no existe o pertenece a una mascota de otro usuario, devuelve `404 Not Found`.
- **Escenario de fallo (Registro ya eliminado):**
  - Si el registro ya fue dado de baja previamente (`isDeleted = true`), el sistema devuelve `404 Not Found`.
- **Escenario de post-condición:**
  - Tras la eliminación, el registro no debe volver a figurar en las consultas públicas (`GET /api/v1/pet-diseases/?idPet={id}`).

### Reglas de Negocio
- La eliminación es estrictamente un borrado lógico (`isDeleted = true`). El registro físico no se elimina de la tabla `pet_disease` para mantener auditoría y trazabilidad histórica.
- No se permite eliminar registros pertenecientes a mascotas ajenas.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `PetDisease` (TDD-0017):** Debe contar con el atributo booleano `isDeleted`.
2. **Autenticación (TDD-0001):** Para verificar pertenencia del recurso.

### Estimación
- **Estimación total:** **1 Story Point** (Escala Fibonacci).
- **Desglose:**
  - Método `destroy` en `PetDiseaseViewSet` y validaciones: *0.5 SP*
  - Modal de confirmación y feedback visual en app móvil: *0.5 SP*

---

## Diseño Técnico (RFC)

### Contrato de API (Django REST Framework)

- **Endpoint:** `DELETE /api/v1/pet-diseases/{id}/`

#### Response Body (`204 No Content`)
- *Respuesta sin contenido al completarse la baja lógica.*

---

## Arquitectura y Flujo (Cliente-Servidor / Expo Mobile)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   -Dentro de su modal de detalle/edición, el usuario presiona el icono o botón "Eliminar".
   - Se muestra un modal nativo o diálogo de confirmación: *"¿Eliminar este diagnóstico? Esta acción quitará la enfermedad del historial clínico de tu mascota."*.
   - Al confirmar, el cliente ejecuta `DELETE /api/v1/pet-diseases/{id}/`.
2. **Servidor (Django REST Framework)**:
   - `PetDiseaseViewSet.destroy()`:
     - Busca el objeto validando que `pet__owner = request.user` e `isDeleted == False`.
     - Si no existe o ya está eliminado, retorna `404 Not Found`.
     - Ejecuta la baja lógica:
       ```python
       instance.isDeleted = True
       instance.save(update_fields=["isDeleted"])
       ```
3. **Respuesta**:
   - Devuelve HTTP `204 No Content`.
   - La aplicación móvil remueve la tarjeta del listado de la pestaña "Enfermedades" en el perfil de la mascota.

---

## Casos de Prueba y Casos de Borde

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Baja lógica exitosa** | Registro propio activo pasa a `isDeleted = True`. | `204 No Content` |
| **ID Inexistente** | Petición `DELETE` sobre un ID no registrado en la base. | `404 Not Found` |
| **Registro de otro usuario** | Petición sobre registro de mascota ajena. | `404 Not Found` |
| **Registro ya eliminado** | Petición sobre un registro cuyo `isDeleted` ya es `true`. | `404 Not Found` |
| **Exclusión del listado** | Al consultar `GET`, la enfermedad eliminada no debe listarse. | Excluido (`200 OK`) |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Sobrescribir Borrado en ViewSet (Backend):**
   - Implementar el método `destroy` en `PetDiseaseViewSet` aplicando soft delete (`isDeleted = True`).
2. **Etapa 2 - Integración en Frontend Móvil:**
   - Crear función `deletePetDisease` en `Frontend/src/services/api.ts`.
   - Agregar modal de confirmación y refresco de estado en la pantalla de la mascota.

