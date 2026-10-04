---
id: 0004
estado: Por implementar
autor: Angeles Schneeberger
fecha: 25-09-2026
titulo: Alta de Mascota
---

# TDD-0004: Alta de Mascota

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores suelen perder la libreta sanitaria física y no cuentan con un registro centralizado de los datos básicos y clínicos de sus mascotas (especialmente en familias con múltiples animales).
- **Resultado esperado:** Permitir que un dueño (`Owner`) registre una nueva mascota (`Pet`) en la app móvil.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario que desea dar de alta a sus mascotas indicando nombre, raza, fecha de nacimiento, peso, estado de castración y foto, para llevar el control sanitario.

### User Story
**Como** dueño de una mascota (`Owner`), **quiero** registrar una nueva mascota indicando sus datos básicos, **para que** pueda gestionar su historia clínica digital de forma centralizada.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si el usuario completa los datos obligatorios (`name`, `birthDate`, `neutered`, `weight`, `idBreed`, `idOwner`), el sistema crea el registro en `Pet`, vinculando la raza, calculando su edad (`age`) al vuelo y asignando `isDeleted = false`.
- **Escenario de fallo (Datos faltantes):**
  - Si se omite algún campo requerido, el sistema impide la creación y devuelve `400 Bad Request`.
- **Escenario de fallo (Relaciones inexistentes):**
  - Si se envía un `Idowner` o `Idbreed` que no existe, el sistema rechaza la operación.
- **Escenario de fallo (Fecha/Peso inválido):**
  - Si `birthDate` es futura, o `weight` es <= 0 o > 150.00 kg, el sistema devuelve un error de validación.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Owner`:** Debe existir el modelo `Owner`.
2. **Entidad `Breed`:** Debe implementarse la tabla y poblarse mediante una *Data Migration* inicial.

### Estimación
- **Estimación total:** **5 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelado (`Breed`, `Pet`), Data Migration y serializers: *2 SP*
  - Endpoints (`GET /api/v1/breeds/`, `POST /api/v1/pets/`): *2 SP*
  - Pantalla Expo (`CreatePetScreen`) y UI dependiente: *1 SP*

---

## Diseño Técnico (RFC)

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models
from django.db.models import Q

class PetSpecies(models.TextChoices):
    DOG = "DOG", "Dog"
    CAT = "CAT", "Cat"

class Breed(models.Model):
    name = models.CharField(max_length=50)
    species = models.CharField(max_length=10, choices=PetSpecies.choices)

    def __str__(self):
        return f"{self.name} ({self.species})"
        
    class Meta:
        db_table = "breed"

class Pet(models.Model):
    name = models.CharField(max_length=100)
    birthDate = models.DateField()
    neutered = models.BooleanField(default=False)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    photo = models.URLField(null=True, blank=True)
    breed = models.ForeignKey(Breed, on_delete=models.PROTECT, related_name="pets")
    isDeleted = models.BooleanField(default=False)
    owner = models.ForeignKey("Owner", on_delete=models.PROTECT, related_name="pets")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def age(self):
        from datetime import date
        today = date.today()
        return today.year - self.birthDate.year - ((today.month, today.day) < (self.birthDate.month, self.birthDate.day))

    class Meta:
        db_table = "pet"
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'name', 'breed', 'birthDate'],
                condition=Q(isDeleted=False),
                name='unique_active_pet_per_owner'
            )
        ]
```

### Contrato de API (Django REST Framework ↔ Expo Mobile)

- **Endpoint:** `POST /api/v1/pets/`
- **Content-Type:** `application/json`

#### Request Body (JSON)

```json
{
  "name": "Milo",
  "birthDate": "2023-05-14",
  "neutered": true,
  "weight": 12.50,
  "photo": "https://storage.example.com/pets/milo.jpg",
  "idBreed": 2,
  "idOwner": 1
}
```

#### Response Body (`201 Created`)

```json
{
  "id": 1,
  "name": "Milo",
  "birthDate": "2023-05-14",
  "age": 3,
  "neutered": true,
  "weight": "12.50",
  "photo": "https://storage.example.com/pets/milo.jpg",
  "breed": {
      "id": 2,
      "name": "Labrador",
      "species": "DOG"
  },
  "isDeleted": false,
  "idOwner": 1,
  "created_at": "2026-09-25T10:45:00Z"
}
```

- **Endpoint:** `GET /api/v1/breeds/`
- **Content-Type:** `application/json`
- **Query Params:** species (DOG | CAT) — `/api/v1/breeds/?species=DOG`


#### Response Body (`200 Ok`)

```json
[
  { "id": 1, "name": "Mixed", "species": "DOG" },
  { "id": 2, "name": "Labrador", "species": "DOG" }
]
``` 

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo Go + NativeWind)**: 
   - La pantalla "Nueva Mascota" maneja la especie (`species`) únicamente como un estado visual (UI) para filtrar. Al seleccionar una especie, el frontend ejecuta `GET /api/v1/breeds/?species={valor}` para poblar dinámicamente el selector de razas.
   - Al guardar, arma el body de la request indicando los datos base y el identificador de la raza elegida (`idBreed`), y realiza el `POST /api/v1/pets/`. No se envía la especie en el payload.
2. **Servidor (Django REST Framework)**:
   - `PetSerializer`: valida los tipos y formatos requeridos (nombre, fecha no futura, peso mayor a cero, formato de URL para la foto) y verifica la existencia de las claves foráneas. Calcula la edad (`age`) al vuelo como campo de solo lectura.
   - `PetViewSet` / vista de creación: toma el `Owner` desde el usuario autenticado (`request.user`) o desde el `idOwner` enviado.
   - Persistencia: guarda el registro directamente en la tabla única `Pet`, vinculando la raza mediante la relación de clave foránea hacia la tabla `Breed`. PostgreSQL garantiza la integridad relacional nativamente.
3. **Respuesta**: el servidor devuelve `201 Created` con el objeto serializado de la mascota; el cliente muestra el mensaje de éxito y redirige al usuario.
---

## Casos de Prueba y Casos de Borde

### Casos de Borde y Errores

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Datos faltantes** | Todos los campos requeridos (`name`, `birthDate`, `neutered`, `weight`, `idOwner`, `idBreed`) deben enviarse en el payload. | `400 Bad Request` |
| **Nombre inválido** | `name` no puede contener únicamente espacios en blanco ni superar los 100 caracteres. | `400 Bad Request` |
| **Peso inválido** | `weight` debe ser un número decimal estrictamente mayor a `0` y menor o igual a `150.00`. | `400 Bad Request` |
| **Fecha de nacimiento futura** | `birthDate` no puede ser posterior a la fecha actual del servidor (`today`). | `400 Bad Request` |
| **Dueño inexistente** | Falla de validación relacional si se intenta asociar a un `idOwner` que no existe en la base de datos. | `400 Bad Request` |
| **Raza inexistente** | Falla de validación relacional si el `idBreed` enviado no existe en la tabla `Breed`. | `400 Bad Request` |
| **Registro duplicado** | No puede existir más de una mascota activa (`isDeleted = false`) para la misma combinación de `idOwner`, `name`, `breed` y `birthDate`. | `409 Conflict` |
| **Error de Infraestructura** | Falla de conexión con el contenedor de PostgreSQL o caída inesperada al intentar persistir. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Persistencia y Modelos (Backend):**
   - Definir el enumerado `PetSpecies` y los modelos `Breed` y `Pet` en `Backend/api/models.py`.
   - Generar una migración de datos vacía (`python manage.py makemigrations --empty`) e implementar el script `RunPython` para cargar el catálogo inicial de razas de perros y gatos en la base de datos.
   - Aplicar las migraciones en PostgreSQL.
2. **Etapa 2 - Lógica de Negocio y API REST (Backend):**
   - Crear `BreedSerializer` y la vista de solo lectura `BreedListView` (filtrable por query param `species`) para exponer el catálogo al frontend.
   - Crear `PetSerializer` en `Backend/api/serializers.py` ajustando las validaciones y agregando el cálculo dinámico del campo `age`.
   - Configurar la vista `PetViewSet` en `Backend/api/views.py` y registrar las nuevas rutas (`breeds/` y `pets/`) en `urls.py`.
3. **Etapa 3 - Integración Móvil (Frontend Expo):**
   - Implementar las funciones de consumo HTTP (`GET /api/v1/breeds/` y `POST /api/v1/pets/`) en `Frontend/src/services/api.ts`.
   - Construir el formulario de alta, incorporando la lógica de estados dependientes para que el selector de razas se actualice dinámicamente al cambiar la especie, y enlazarlo con el flujo de la aplicación.

---