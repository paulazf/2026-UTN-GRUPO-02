---
id: 0017
estado: Por implementar
autor: Paula Zacarías
fecha: 07-10-2026
titulo: Alta de Enfermedad en Mascota
---

# TDD-0017: Alta de Enfermedad en Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores de mascotas necesitan llevar un control centralizado de los diagnósticos y patologías que han atravesado o atraviesan sus animales. Sin un registro formal de las enfermedades, sus períodos de duración y notas u observaciones sobre el cuadro, resulta difícil para el veterinario conocer antecedentes médicos relevantes durante consultas clínicas o emergencias.
- **Resultado esperado:** Permitir al dueño registrar una enfermedad (`PetDisease`) asociada a una de sus mascotas (`Pet`), seleccionándola desde el catálogo precargado (`Disease`), indicando la fecha de diagnóstico/inicio (`startDate`), opcionalmente la fecha de recuperación/alta (`endDate`), y un campo de notas u observaciones (`notes`) opcional.

### User Persona
- **Dueño de mascota (Owner):** Usuario registrado que desea asentar patologías actuales o pasadas en la historia clínica digital de su mascota con anotaciones clínicas pertinentes.

### User Story
**Como** dueño de una mascota, **quiero** registrar una enfermedad diagnosticada a mi mascota indicando su fecha de inicio, fecha de finalización y notas u observaciones, **para que** quede asentado su historial patológico completo y pueda consultarse en futuras visitas al veterinario.

### Criterios de Aceptación
- **Escenario de éxito (Enfermedad en curso con notas):**
  - Si se proporciona un `idPet` perteneciente a una mascota activa del usuario, un `idDisease` válido de una enfermedad activa del catálogo, una `startDate` válida (no futura) con `endDate = null`, y opcionalmente un texto en `notes`, el sistema crea el registro en `PetDisease` con `isDeleted = false` y devuelve `201 Created`.
- **Escenario de éxito (Enfermedad concluida):**
  - Si se envía un `endDate` válido mayor o igual a `startDate`, el sistema guarda el registro con ambas fechas y devuelve `201 Created`.
- **Escenario de éxito (Notas vacías o ausentes):**
  - El campo `notes` es completamente opcional; si se envía como `null`, cadena vacía `""` o se omite, el registro se crea satisfactoriamente.
- **Escenario de fallo (Datos obligatorios faltantes):**
  - Si se omite `idPet`, `idDisease` o `startDate`, el sistema rechaza la petición devolviendo `400 Bad Request`.
- **Escenario de fallo (Fechas inválidas):**
  - Si `startDate` es una fecha posterior al día actual (`today`), o si `endDate` es anterior a `startDate`, el sistema devuelve `400 Bad Request`.
- **Escenario de fallo (Mascota o enfermedad inexistente o ajena):**
  - Si el `idPet` no existe, pertenece a otro usuario o está dado de baja (`isDeleted = true`), el sistema devuelve `404 Not Found`.
  - Si el `idDisease` no existe o está dado de baja en el catálogo (`isDeleted = true`), el sistema devuelve `404 Not Found`.
- **Escenario de fallo (Enfermedad activa duplicada):**
  - Si se intenta registrar una enfermedad que ya se encuentra activa en esa misma mascota (`endDate` nulo y no eliminada), el sistema impide la duplicación devolviendo `409 Conflict`.

### Reglas de Negocio
- La relación `PetDisease` asocia una mascota (`Pet`) con una enfermedad del catálogo (`Disease`).
- La fecha de inicio (`startDate`) es obligatoria y no puede ser posterior al día actual (`today`).
- La fecha de fin (`endDate`) es opcional (`nullable`): representa el momento en que la mascota fue dada de alta o se recuperó. Si es nula, se considera una afección en curso o crónica.
- Si se indica `endDate`, debe cumplirse estrictamente: `endDate >= startDate`.
- El campo `notes` es opcional (texto libre para observaciones, síntomas o indicaciones médicas).
- Si se elimina una enfermedad del catálogo, la integridad referencial se protege mediante `on_delete=models.PROTECT`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Pet` (TDD-0004):** Debe existir la mascota activa y validarse la pertenencia al usuario.
2. **Entidad `Disease` (TDD-0007):** Debe existir el catálogo precargado de enfermedades.
3. **Autenticación de usuario (TDD-0001):** Necesaria para identificar al dueño y asegurar que solo gestione sus propias mascotas.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `PetDisease` con campo `notes` y migración: *1 SP*
  - Serializer, validación de fechas/duplicidad y endpoint `POST /api/v1/pet-diseases/`: *1 SP*
  - Integración en frontend móvil (Pestaña "Enfermedades" con modal de alta): *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.core.exceptions import ValidationError
from datetime import date
from .pet import Pet
from .disease import Disease


class PetDisease(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.PROTECT, related_name="diseases", db_column="idPet")
    disease = models.ForeignKey(Disease, on_delete=models.PROTECT, related_name="pet_cases", db_column="idDisease")
    startDate = models.DateField()
    endDate = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "pet_disease"
        ordering = ["-startDate", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "disease"],
                condition=models.Q(isDeleted=False, endDate__isnull=True),
                name="unique_active_disease_per_pet",
            ),
            models.UniqueConstraint(
                fields=["pet", "disease", "startDate"],
                condition=models.Q(isDeleted=False),
                name="unique_pet_disease_start_date",
            )
        ]

    def clean(self):
        if self.startDate and self.startDate > date.today():
            raise ValidationError({"startDate": "La fecha de inicio no puede ser futura."})
        if self.endDate and self.startDate and self.endDate < self.startDate:
            raise ValidationError({"endDate": "La fecha de fin no puede ser anterior a la fecha de inicio."})

    def __str__(self):
        return f"{self.pet.name} - {self.disease.name} ({self.startDate})"
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/pet-diseases/`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "idPet": 1,
  "idDisease": 3,
  "startDate": "2026-05-10",
  "endDate": null,
  "notes": "Presentó fiebre y decaimiento leve durante los primeros días."
}
```

#### Response Body (`201 Created`)

```json
{
  "id": 1,
  "idPet": 1,
  "petName": "Milo",
  "idDisease": 3,
  "diseaseName": "Rabia",
  "startDate": "2026-05-10",
  "endDate": null,
  "notes": "Presentó fiebre y decaimiento leve durante los primeros días.",
  "isDeleted": false
}
```

---

## Arquitectura y Flujo (Cliente-Servidor / Expo Mobile)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - Al entrar al **perfil de la mascota**, el usuario navega a la pestaña **"Enfermedades"**.
   - En esta pestaña se visualiza el **listado de las enfermedades** que ha tenido o tiene la mascota.
   - La pantalla contiene un botón destacado **"+ Agregar Enfermedad"** (o botón flotante de acción).
   - Al tocar el botón, se despliega un **modal / bottom sheet** de alta que incluye:
     - **Selector de enfermedad:** dropdown / buscador alimentado por `GET /api/v1/diseases/`.
     - **Fecha de inicio (`startDate`):** selector de fecha nativo (no permite fecha futura).
     - **Fecha de fin (`endDate`):** selector de fecha.
     - **Notas u observaciones (`notes`):** campo de texto multilínea opcional para anotaciones clínicas o evolución del cuadro.
   - Al pulsar "Guardar", la app valida localmente y despacha la petición `POST /api/v1/pet-diseases/`.
2. **Servidor (Django REST Framework)**:
   - `PetDiseaseSerializer`:
     - Valida existencia de `idPet` y comprueba que pertenezca al usuario autenticado.
     - Valida existencia de `idDisease` en el catálogo activo (`isDeleted=False`).
     - Valida consistencia de fechas (`startDate <= today` y `endDate >= startDate`).
     - Admite `notes` como texto opcional sin restricción de obligatoriedad.
     - Verifica que no exista un registro activo duplicado (`endDate` nulo/`startDate`duplicado cuando `endDate`no es nulo) para esa misma mascota y enfermedad (`409 Conflict`).
   - Persiste el registro en la tabla `pet_disease`.
3. **Respuesta**:
   - Devuelve `201 Created` con el objeto serializado. La aplicación móvil cierra el modal, muestra un mensaje de éxito e inserta el nuevo diagnóstico en el listado de la pestaña "Enfermedades".

---

## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta exitosa con notas** | Datos válidos y texto en `notes`. | `201 Created` |
| **Alta exitosa sin notas** | Datos válidos con `notes` nulo o ausente. | `201 Created` |
| **Alta exitosa concluida** | Fechas válidas con `endDate >= startDate`. | `201 Created` |
| **Campos obligatorios faltantes** | Omisión de `idPet`, `idDisease` o `startDate`. | `400 Bad Request` |
| **Fecha de inicio futura** | `startDate` posterior a la fecha actual (`today`). | `400 Bad Request` |
| **Fecha de fin anterior a inicio** | `endDate < startDate`. | `400 Bad Request` |
| **Mascota inexistente o ajena** | `idPet` no existe, está eliminado o pertenece a otro usuario. | `404 Not Found` |
| **Enfermedad inexistente o inactiva** | `idDisease` no existe en catálogo o `isDeleted = true`. | `404 Not Found` |
| **Duplicado activo** | La mascota ya tiene un registro activo (`endDate = null` / `startDate`duplicada) de la misma enfermedad. | `409 Conflict` |
| **Falla de Persistencia** | Error interno de conexión con la base de datos PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Modelo y Migraciones (Backend):**
   - Crear el modelo `PetDisease` en `Backend/api/models/pet_disease.py` con campos `pet`, `disease`, `startDate`, `endDate`, `notes` e `isDeleted`.
   - Generar y ejecutar la migración correspondiente.
2. **Etapa 2 - Serializador y ViewSet (Backend):**
   - Implementar `PetDiseaseSerializer` contemplando validaciones de fechas y campo `notes`.
   - Configurar `PetDiseaseViewSet.create` y registrar la ruta en `urls.py`.
3. **Etapa 3 - UI Móvil (Frontend Expo):**
   - Crear el servicio `createPetDisease` en `Frontend/src/services/api.ts`.
   - Implementar en el perfil de la mascota la pestaña "Enfermedades" con el modal de alta con formulario completo.
