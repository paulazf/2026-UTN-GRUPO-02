---
id: 0038
estado: Por implementar
autor: Angeles Schneeberger
fecha: 25-10-2026
titulo: Alta de Alimentación de Mascota
---

# TDD-0038: Alta de Alimentación de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores de mascotas pueden olvidar las especificaciones nutricionales exactas de sus mascotas (marcas, tipos de alimentos, porciones y frecuencias). Asimismo, cuando las mascotas quedan al cuidado de terceros o se asiste a una consulta veterinaria, no se dispone de una ficha nutricional clara y actualizada.
- **Resultado esperado:** Permitir que un dueño (`Owner`) registre un nuevo plan o pauta de alimentación (`Feeding`) para una de sus mascotas (`Pet`), detallando el alimento, el tipo de comida, el tamaño de la porción, la frecuencia diaria, la fecha de inicio y observaciones.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario autenticado en la aplicación móvil que administra la rutina diaria y el cuidado sanitario de sus mascotas.

### User Story
**Como** dueño de una mascota (`Owner`), **quiero** registrar la alimentación de mi mascota indicando el alimento, tipo, porción, frecuencia y fecha de inicio, **para que** pueda llevar el control de su nutrición y tenerlo disponible ante cuidadores o consultas veterinarias.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el usuario proporciona un `idPet` perteneciente a una mascota activa de su propiedad, un nombre de alimento (`food`), un tipo válido (`type` perteneciente a los valores permitidos), una porción (`portion`), una fecha de inicio (`sinceDate`) no futura y una frecuencia (`frequency`), el sistema crea el registro en `Feeding` con `isDeleted = false` y devuelve `201 Created` con el objeto completo.
- **Escenario de fallo (Datos obligatorios faltantes):**
  - Si falta alguno de los campos requeridos (`idPet`, `food`, `type`, `sinceDate`), el sistema rechaza la petición con `400 Bad Request`.
- **Escenario de fallo (Tipo de alimento inválido):**
  - Si el valor de `type` no coincide con uno de los tipos permitidos (`DRY_FOOD`, `WET_FOOD`, `VETERINARY_DIET`, `HOMEMADE`, `MIXED`), devuelve `400 Bad Request`.
- **Escenario de fallo (Fecha de inicio futura):**
  - Si `sinceDate` es posterior a la fecha actual (`today`), el sistema devuelve `400 Bad Request` indicando que la fecha de inicio no puede ser futura.
- **Escenario de fallo (Mascota inexistente o ajena):**
  - Si el `idPet` no existe, se encuentra dado de baja (`isDeleted = true`) o pertenece a otro tutor, el sistema responde `404 Not Found` por razones de seguridad.

### Reglas de Negocio
- **Tipos de Alimento Permitidos (`FeedingType`):**
  1. `DRY_FOOD` ("Alimento seco"): Balanceado seco comercial.
  2. `WET_FOOD` ("Alimento húmedo"): Latas, sobres y patés.
  3. `VETERINARY_DIET` ("Dieta veterinaria"): Alimentos medicados o de prescripción (renal, gastrointestinal, urinario, hipoalergénico, etc.).
  4. `HOMEMADE` ("Dieta casera"): Comida cocinada casera o dietas crudas biológicamente apropiadas.
  5. `MIXED` ("Alimentación mixta"): Combinación simultánea de alimento seco con húmedo o casero.
- **Campos de texto descriptivo:** `portion` (ej. "80g por ración", "1 taza medidora") y `frequency` (ej. "2 veces al día", "Mañana y noche", "Cada 8 horas") son cadenas descriptivas para ofrecer máxima flexibilidad al tutor sin forzar unidades restrictivas.
- **Fecha `sinceDate`:** Registra cuándo comenzó la mascota a consumir este alimento. 

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Pet` (TDD-0004):** Modelo base de mascota en PostgreSQL.
2. **Autenticación `Owner` (TDD-0001):** Verificación de identidad.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `Feeding`, enumerador `FeedingType` y migración en base de datos: *1 SP*
  - Serializer con validaciones de fechas y tipo: *1 SP*
  - Endpoint `POST /api/v1/feedings/` y tests unitarios/integración en Django: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.core.exceptions import ValidationError
from datetime import date
from .pet import Pet


class FeedingType(models.TextChoices):
    DRY_FOOD = "DRY_FOOD", "Alimento seco"
    WET_FOOD = "WET_FOOD", "Alimento húmedo"
    VETERINARY_DIET = "VETERINARY_DIET", "Dieta veterinaria"
    HOMEMADE = "HOMEMADE", "Dieta casera"
    MIXED = "MIXED", "Alimentación mixta"


class Feeding(models.Model):
    idFeeding = models.AutoField(primary_key=True, db_column="idFeeding")
    pet = models.ForeignKey(
        Pet,
        on_delete=models.PROTECT,
        related_name="feedings",
        db_column="idPet",
    )
    food = models.CharField(max_length=150, help_text="Nombre o marca del alimento")
    type = models.CharField(max_length=30, choices=FeedingType.choices)
    portion = models.CharField(blank=True, max_length=100, help_text="Ej: '80g', '1 taza'")
    sinceDate = models.DateField(db_column="sinceDate")
    frequency = models.CharField(blank=True, ax_length=100, help_text="Ej: '2 veces al día'")
    notes = models.TextField(blank=True, default="")
    isDeleted = models.BooleanField(default=False, db_column="isDeleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "feeding"
        ordering = ["-sinceDate", "-idFeeding"]
        constraints = [
            models.UniqueConstraint(
                fields=["pet", "food", "sinceDate"],
                condition=models.Q(isDeleted=False),
                name="unique_active_feeding_per_pet",
            )
        ]

    def clean(self):
        if self.sinceDate and self.sinceDate > date.today():
            raise ValidationError({"sinceDate": "La fecha de inicio no puede ser futura."})

    def __str__(self):
        return f"{self.pet.name} - {self.food} ({self.get_type_display()})"
```

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `POST /api/v1/feedings/`
- **Content-Type:** `application/json`
- **Headers:** `Authorization: Bearer <token>`

#### Request Body (JSON)

```json
{
  "idPet": 1,
  "food": "Royal Canin Mini Adult",
  "type": "DRY_FOOD",
  "portion": "120g al día",
  "sinceDate": "2026-05-10",
  "frequency": "2 veces al día (mañana y noche)",
  "notes": "Dividir en dos porciones iguales de 60g."
}
```

#### Response Body (`201 Created`)

```json
{
  "idFeeding": 1,
  "idPet": 1,
  "food": "Royal Canin Mini Adult",
  "type": "DRY_FOOD",
  "typeDisplay": "Alimento seco",
  "portion": "120g al día",
  "sinceDate": "2026-05-10",
  "frequency": "2 veces al día (mañana y noche)",
  "notes": "Dividir en dos porciones iguales de 60g.",
  "isDeleted": false,
  "created_at": "2026-10-25T11:00:00Z",
  "updated_at": "2026-10-25T11:00:00Z"
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go + NativeWind)**:
   - En el perfil de la mascota, el usuario navega a la sección de "Alimentación" y agrega una nueva pauta alimentaria. 
   - El formulario presenta un selector para el tipo de alimento (`FeedingType`), campos de texto para `food`, `portion`, `frequency`, un selector de fecha para `sinceDate` y un área de texto opcional para `notes`.
   - Al enviar el formulario, el cliente realiza la petición `POST /api/v1/feedings/` enviando el token de autenticación.
2. **Servidor (Django REST Framework)**:
   - `FeedingSerializer` valida los datos recibidos:
     - Comprueba que la mascota exista, pertenezca al usuario autenticado (`active_pets(request)`) y no esté dada de baja (`isDeleted = False`).
     - Valida que `sinceDate <= date.today()`.
     - Valida que el `type` sea uno de los choices válidos.
   - `FeedingViewSet` persiste la entidad en la base de datos PostgreSQL mediante el ORM de Django.
3. **Respuesta**:
   - El servidor responde `201 Created` con el registro serializado.
   - La aplicación móvil actualiza el estado local, cierra el modal/pantalla de creación y muestra una notificación de éxito ("Pauta de alimentación registrada con éxito").

---

## Casos de Prueba y Casos de Borde

### Casos de Borde y Errores

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| :--- | :--- | :--- |
| **Campos obligatorios faltantes** | Falta `idPet`, `food`, `type` o `sinceDate`. | `400 Bad Request` |
| **Tipo de alimento no válido** | `type` no pertenece a `['DRY_FOOD', 'WET_FOOD', 'VETERINARY_DIET', 'HOMEMADE', 'MIXED']`. | `400 Bad Request` |
| **Fecha de inicio futura** | `sinceDate` es estrictamente mayor a la fecha actual (`today`). | `400 Bad Request` |
| **Texto en blanco o excedido** | `food` o `portion` vacíos o superan los límites de caracteres configurados. | `400 Bad Request` |
| **Mascota inexistente o ajena** | `idPet` no existe, está marcado con `isDeleted = true` o pertenece a otro usuario. | `404 Not Found` |
| **Falla de base de datos** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Modelado y Base de Datos (Backend):**
   - Crear el modelo `Feeding` y el enumerado `FeedingType` en `Backend/api/models/feeding.py` y exponerlo en `Backend/api/models/__init__.py`.
   - Generar y ejecutar las migraciones correspondientes de Django en PostgreSQL.
2. **Etapa 2 - Serializers y Vistas (Backend):**
   - Crear `FeedingSerializer` en `Backend/api/serializers/feeding.py` implementando validaciones de pertenencia, fechas y duplicados.
   - Crear `FeedingViewSet` en `Backend/api/views/feeding.py` y registrar el endpoint en `Backend/api/urls.py`.
3. **Etapa 3 - Interfaz Móvil (Frontend Expo):**
   - Agregar el servicio `createFeeding` en el cliente API de React Native.
   - Diseñar el formulario de alta con selectores de tipo, fecha y campos de texto con validaciones visuales.