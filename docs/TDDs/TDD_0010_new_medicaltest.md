---
id: 0010
estado: Por implementar
autor: Thiago Perez
fecha: 03-10-2026
titulo: Alta de Estudio Médico
---

# TDD-0010: Alta de Estudio Médico

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los dueños guardan los resultados de análisis, radiografías y ecografías de sus mascotas en papel, en el mail o en la galería del celular. Cuando los necesita el veterinario no están a mano o se perdieron. Además, muchas veces el estudio se hace y el resultado llega días después, y no hay dónde registrar que está pendiente.
- **Resultado esperado:** Permitir registrar un estudio (`MedicalTest`) de una mascota (`Pet`) con su tipo, fecha, veterinario, estado y resultado, y opcionalmente adjuntar el archivo (PDF o imagen), para que quede en su historia clínica.

### User Persona
- **Dueño de mascota (Owner):** Usuario registrado que quiere centralizar en la app los estudios veterinarios de su(s) mascota(s).

### User Story
**Como** dueño de una mascota, **quiero** registrar los estudios veterinarios de mi mascota con su resultado y su archivo, **para que** queden guardados en su historia clínica y pueda consultarlos o mostrarlos cuando los necesite.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si se envía un `idPet` de una mascota activa del usuario autenticado y los datos son válidos, el sistema crea el registro en `MedicalTest` con `idMedicalTest` autonumérico e `isDeleted = false`, guarda el archivo si se adjuntó, y devuelve `201 Created`.
- **Escenario de éxito (Estudio pendiente):**
  - Si `status = "pending"`, se permite crear el estudio sin `resultSummary`, sin `resultDetail` y sin `file` (el resultado se carga después, ver TDD-0012).
- **Escenario de fallo (Datos obligatorios faltantes o vacíos):**
  - Si falta `idPet`, `name`, `type`, `date` o `status`, o si `name` está compuesto solo por espacios, devuelve `400 Bad Request`.
- **Escenario de fallo (Valores inválidos):**
  - Si `type` o `status` no son valores permitidos, o `date` es futura o tiene formato inválido, devuelve `400 Bad Request`.
- **Escenario de fallo (Resultado faltante):**
  - Si `status` es `"normal"` o `"altered"` y no se envía `resultSummary`, devuelve `400 Bad Request` (un estudio con resultado tiene que decir cuál es).
- **Escenario de fallo (Archivo inválido):**
  - Si se adjunta un archivo que no es PDF, JPG, JPEG o PNG, o supera los **10 MB**, devuelve `400 Bad Request` indicando el motivo.
- **Escenario de fallo (Mascota inexistente o ajena):**
  - Si el `idPet` no existe, la mascota está dada de baja (`isDeleted = true`) o pertenece a otro usuario, devuelve `404 Not Found` (no se revela si la mascota existe).

### Reglas de Negocio
- Un estudio pertenece a **una sola** mascota (relación 1:N `Pet` → `MedicalTest`, según el DER).
- Tipos (`type`): `laboratory` (Laboratorio), `imaging` (Imagen), `other` (Otro).
- Estados (`status`): `normal` (Normal), `altered` (Alterado), `pending` (Pendiente).
- La fecha del estudio (`date`) no puede ser posterior al día actual.
- `resultSummary` es obligatorio si `status` es `normal` o `altered`; opcional si es `pending`.
- El archivo es **opcional**: un estudio pendiente todavía no tiene archivo, y algunos resultados se reciben solo como texto.
- Formatos de archivo permitidos: `application/pdf`, `image/jpeg`, `image/png`. Tamaño máximo: 10 MB.
- Se permiten nombres repetidos dentro de la misma mascota (p. ej. dos "Hemograma" de distintas fechas).

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Pet` (EP02 - CRUD Mascota):** El modelo `Pet` debe existir con `idPet`, su relación con `Owner` y el flag `isDeleted`.
2. **Autenticación de usuario (EP01 - CRUD Usuario, TDD-0001):** Necesaria para identificar al dueño y validar la pertenencia de la mascota.
3. **Almacenamiento de archivos:** Configurar `MEDIA_ROOT` / `MEDIA_URL` en `settings.py`, servir media en desarrollo desde `urls.py` y montar un volumen `media_data` en el servicio `api` de `docker-compose.yml`.
4. **Mockup (Figma, "Modal · Subir estudio"):** Agregar al formulario el campo para adjuntar el archivo, que hoy no está (ver sección "Ajustes al mockup").

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Modelo `MedicalTest`, migración y configuración de media/volumen: *1 SP*
  - Serializer con validaciones de campos, regla de resultado obligatorio, archivo y pertenencia de la mascota: *1 SP*
  - Endpoint `POST /api/v1/medical-test/` (multipart) y tests: *1 SP*

---

## Diseño Técnico (RFC)

### Decisión de almacenamiento del archivo
El DER define `archivo` como `BLOB`. Se propone guardar el archivo en el sistema de archivos (volumen de Docker) mediante `FileField`, y en la base solo la **ruta** (`VARCHAR`). Motivos:
- Evita inflar la base PostgreSQL y sus backups con binarios de varios MB.
- Django sirve y descarga los archivos por URL sin tener que leer el binario desde la base, lo que simplifica "Ver PDF" y "Compartir" en la app.
- Permite migrar a un storage externo (S3, GCS) más adelante cambiando solo la configuración.

### Cambios al DER
Al aprobar este TDD se debe actualizar la entidad `Estudio` del DER para que coincida con el mockup:

| Campo DER actual | Campo nuevo | Tipo |
| --- | --- | --- |
| `idEstudios` | `idMedicalTest` | INT PK |
| (FK a Pet) | `idPet` | INT FK |
| `nombre` | `name` | STRING |
| (no existe) | `type` | STRING (enum) |
| (no existe) | `date` | DATE |
| (no existe) | `veterinarian` | STRING NULLABLE |
| (no existe) | `status` | STRING (enum) |
| (no existe) | `resultSummary` | STRING NULLABLE |
| (no existe) | `resultDetail` | TEXT NULLABLE |
| `archivo` (BLOB) | `file` | STRING NULLABLE (ruta) |
| (no existe) | `isDeleted` | BOOLEAN |

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models


def medical_test_upload_path(instance, filename):
    return f"medical_tests/pet_{instance.pet_id}/{filename}"


class MedicalTest(models.Model):
    class Type(models.TextChoices):
        LABORATORY = "laboratory", "Laboratorio"
        IMAGING = "imaging", "Imagen"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        NORMAL = "normal", "Normal"
        ALTERED = "altered", "Alterado"
        PENDING = "pending", "Pendiente"

    idMedicalTest = models.AutoField(primary_key=True, db_column="idMedicalTest")
    pet = models.ForeignKey(
        "Pet",
        on_delete=models.PROTECT,
        db_column="idPet",
        related_name="medicalTests",
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=Type.choices)
    date = models.DateField()
    veterinarian = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices)
    resultSummary = models.CharField(max_length=100, blank=True, default="")
    resultDetail = models.TextField(max_length=2000, blank=True, default="")
    file = models.FileField(
        upload_to=medical_test_upload_path, max_length=255, null=True, blank=True
    )
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "medical_test"
        ordering = ["-date", "-idMedicalTest"]

    def __str__(self):
        return f"{self.name} ({self.pet_id})"
```

### Configuración de archivos

```python
# core/settings.py
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

MEDICAL_TEST_MAX_SIZE = 10 * 1024 * 1024  # 10 MB
MEDICAL_TEST_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"]
```

```yaml
# docker-compose.yml (servicio api)
volumes:
  - ./Backend:/app
  - media_data:/app/media
```

### Contrato de API (Django REST Framework)

- **Endpoint:** `POST /api/v1/medical-test/`
- **Content-Type:** `multipart/form-data` (o `application/json` si no se adjunta archivo)

#### Request Body

| Campo | Tipo | Obligatorio | Campo del mockup |
| --- | --- | --- | --- |
| `idPet` | INT | Sí | Mascota seleccionada |
| `name` | STRING (máx. 100) | Sí | Nombre del estudio |
| `type` | `laboratory` \| `imaging` \| `other` | Sí | Tipo |
| `date` | DATE (`YYYY-MM-DD`) | Sí | Fecha |
| `veterinarian` | STRING (máx. 100) | No | Veterinario/a |
| `status` | `normal` \| `altered` \| `pending` | Sí | Estado |
| `resultSummary` | STRING (máx. 100) | Si `status` ≠ `pending` | Resultado resumido |
| `resultDetail` | TEXT (máx. 2000) | No | Detalle del resultado |
| `file` | FILE (PDF/JPG/PNG, máx. 10 MB) | No | (a agregar en el mockup) |

#### Response Body (`201 Created`)

```json
{
  "idMedicalTest": 1,
  "idPet": 3,
  "petName": "Beto",
  "name": "Radiografía de cadera",
  "type": "imaging",
  "date": "2026-05-20",
  "veterinarian": "Dr. Acosta",
  "status": "altered",
  "resultSummary": "Displasia leve",
  "resultDetail": "Score B/B según clasificación FCI. Remodelación leve de cabeza femoral derecha.",
  "file": "http://192.168.0.13:8000/media/medical_tests/pet_3/rx_cadera.pdf",
  "isDeleted": false
}
```

Si no se adjuntó archivo, `file` es `null`.

#### Response Body (`400 Bad Request`, ejemplo)

```json
{
  "resultSummary": ["El resultado resumido es obligatorio cuando el estado es Normal o Alterado."]
}
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (App móvil React Native / Expo)**:
   - Desde la pestaña "Estudios" de la mascota, el usuario toca "+ Subir" y se abre el bottom sheet "Subir estudio".
   - Completa el formulario y, opcionalmente, adjunta el archivo (`expo-document-picker` para PDF, `expo-image-picker` para foto o galería).
   - Envía `POST /api/v1/medical-test/` como `multipart/form-data`.
2. **Servidor (Django REST Framework)**:
   - `MedicalTestViewSet` usa `MultiPartParser` y `JSONParser`, y exige usuario autenticado.
   - `MedicalTestSerializer`:
     - `validate_name`: aplica `strip()` y rechaza cadenas vacías.
     - `validate_date`: rechaza fechas posteriores a `date.today()`.
     - `validate_file`: si hay archivo, controla `file.size <= MEDICAL_TEST_MAX_SIZE`, `file.size > 0` y `file.content_type` en `MEDICAL_TEST_ALLOWED_TYPES`.
     - `validate`: si `status` es `normal` o `altered`, exige `resultSummary` no vacío.
     - `idPet` (`PrimaryKeyRelatedField` con `source="pet"`): queryset limitado a mascotas activas del usuario autenticado. Si el id no está, la vista responde `404 Not Found`.
     - `petName` (solo lectura, `source="pet.name"`): lo usa el historial general para el badge de la mascota.
   - Django guarda el archivo en `MEDIA_ROOT/medical_tests/pet_<idPet>/` e inserta el registro en `medical_test`.
3. **Respuesta**:
   - Devuelve `201 Created` con el estudio creado. La app lo agrega a la lista en su grupo (Laboratorio, Imágenes, Otros) y, si está pendiente, en el aviso "Resultado pendiente".

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta completa con PDF** | Todos los campos válidos, `status = normal`, PDF de 2 MB. Se crea el registro y el archivo existe en disco. | `201 Created` |
| **Alta con imagen** | Igual al anterior con un JPG o PNG. | `201 Created` |
| **Alta sin archivo** | Campos válidos, `status = normal`, `resultSummary` cargado, sin `file`. `file` queda `null`. | `201 Created` |
| **Alta pendiente** | `status = pending`, sin `resultSummary`, sin `resultDetail`, sin `file`. | `201 Created` |
| **Sin veterinario** | No se envía `veterinarian`. Queda vacío. | `201 Created` |
| **Nombre faltante o solo espacios** | `name` ausente o `"   "`. | `400 Bad Request` |
| **Nombre demasiado largo** | `name` de más de 100 caracteres. | `400 Bad Request` |
| **Tipo faltante o inválido** | `type` ausente o `"ecografia"`. | `400 Bad Request` |
| **Estado faltante o inválido** | `status` ausente o `"ok"`. | `400 Bad Request` |
| **Fecha faltante o mal formada** | `date` ausente o `"32/13/2026"`. | `400 Bad Request` |
| **Fecha futura** | `date` posterior a hoy. | `400 Bad Request` |
| **Resultado faltante con estado Normal/Alterado** | `status = altered` sin `resultSummary`. | `400 Bad Request` |
| **Formato de archivo no permitido** | Se sube un `.docx`, `.exe` o `.zip`. | `400 Bad Request` |
| **Archivo demasiado grande** | Archivo de más de 10 MB. | `400 Bad Request` |
| **Archivo vacío** | Archivo de 0 bytes. | `400 Bad Request` |
| **Mascota inexistente** | `idPet` que no existe en la base. | `404 Not Found` |
| **Mascota dada de baja** | `idPet` con `isDeleted = true`. | `404 Not Found` |
| **Mascota de otro dueño** | `idPet` existente pero de otro usuario. | `404 Not Found` |
| **Sin autenticación** | Petición sin credenciales. | `401 Unauthorized` |
| **Nombre repetido en la misma mascota** | Ya existe "Hemograma" para la mascota; se carga otro "Hemograma". Se permite. | `201 Created` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL o de escritura en disco. No debe quedar registro sin archivo ni archivo sin registro. | `500 Internal Server Error` |

---

## Ajustes al mockup (Figma)
- **"Modal · Subir estudio" no tiene campo para adjuntar archivo**, pero la tarjeta expandida muestra "Ver PDF" y "Compartir". Hay que agregar un campo "Archivo (opcional)" con botones "Elegir archivo" / "Sacar foto".
- El botón "Ver PDF" debería decir "Ver archivo" (también puede ser una imagen) y mostrarse solo si el estudio tiene archivo.

---

## Plan de Implementación

1. **Etapa 1 - Configuración de archivos:**
   - Agregar `MEDIA_URL`, `MEDIA_ROOT`, `MEDICAL_TEST_MAX_SIZE` y `MEDICAL_TEST_ALLOWED_TYPES` en `core/settings.py`.
   - Servir media en desarrollo en `core/urls.py` (`static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`).
   - Agregar el volumen `media_data` al servicio `api` en `docker-compose.yml` y `Backend/media/` al `.gitignore`.
2. **Etapa 2 - Persistencia y Modelo:**
   - Definir el modelo `MedicalTest` en `Backend/api/models.py` con sus `TextChoices` y la FK a `Pet` (`on_delete=PROTECT`).
   - Generar y ejecutar la migración (`python manage.py makemigrations` y `migrate`).
3. **Etapa 3 - Serializer:**
   - Crear `MedicalTestSerializer` en `Backend/api/serializers.py` con `validate_name`, `validate_date`, `validate_file`, `validate` (resultado obligatorio según estado), `idPet` filtrado por dueño y `petName` de solo lectura.
4. **Etapa 4 - Endpoint y Enrutamiento:**
   - Definir `MedicalTestViewSet` en `Backend/api/views.py` con la acción `create`, parsers multipart y JSON, y permiso `IsAuthenticated`.
   - Registrar la ruta `medical-test/` en el router de `api/v1/`.
5. **Etapa 5 - Tests:**
   - Tests en `Backend/api/tests.py` con `APITestCase` y `SimpleUploadedFile`, usando `override_settings(MEDIA_ROOT=<carpeta temporal>)` para no ensuciar `media/`.