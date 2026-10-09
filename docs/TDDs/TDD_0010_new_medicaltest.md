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
- **Resultado esperado:** Permitir registrar un estudio (`MedicalTest`) de una mascota (`Pet`) con su tipo, fecha, veterinario, estado y resultado, y opcionalmente adjuntar sus archivos (PDF o imágenes; p. ej. el informe y las placas de una radiografía), para que quede en su historia clínica.

### User Persona
- **Dueño de mascota (Owner):** Usuario registrado que quiere centralizar en la app los estudios veterinarios de su(s) mascota(s).

### User Story
**Como** dueño de una mascota, **quiero** registrar los estudios veterinarios de mi mascota con su resultado y su archivo, **para que** queden guardados en su historia clínica y pueda consultarlos o mostrarlos cuando los necesite.

### Criterios de Aceptación
- **Escenario de éxito:**
  - Si se envía un `idPet` de una mascota activa del usuario autenticado y los datos son válidos, el sistema crea el registro en `MedicalTest` con `idMedicalTest` autonumérico e `isDeleted = false`, guarda los archivos adjuntos (si los hay) en `MedicalTestFile`, y devuelve `201 Created`.
- **Escenario de éxito (Estudio pendiente):**
  - Si `status = "pending"`, se permite crear el estudio sin `resultSummary`, sin `resultDetail` y sin archivos (el resultado se carga después, ver TDD-0012).
- **Escenario de fallo (Datos obligatorios faltantes o vacíos):**
  - Si falta `idPet`, `name`, `type`, `date` o `status`, o si `name` está compuesto solo por espacios, devuelve `400 Bad Request`.
- **Escenario de fallo (Valores inválidos):**
  - Si `type` o `status` no son valores permitidos, o `date` es futura o tiene formato inválido, devuelve `400 Bad Request`.
- **Escenario de fallo (Resultado faltante):**
  - Si `status` es `"normal"` o `"altered"` y no se envía `resultSummary`, devuelve `400 Bad Request` (un estudio con resultado tiene que decir cuál es).
- **Escenario de fallo (Archivo inválido):**
  - Si alguno de los archivos no es PDF, JPG, JPEG o PNG, o supera los **10 MB**, o se adjuntan más de **10 archivos**, devuelve `400 Bad Request` indicando el motivo y no se guarda nada (ni el estudio ni los demás archivos).
- **Escenario de fallo (Mascota inexistente o ajena):**
  - Si el `idPet` no existe, la mascota está dada de baja (`isDeleted = true`) o pertenece a otro usuario, devuelve `404 Not Found` (no se revela si la mascota existe).

### Reglas de Negocio
- Un estudio pertenece a **una sola** mascota (relación 1:N `Pet` → `MedicalTest`, según el DER).
- Tipos (`type`): `laboratory` (Laboratorio), `imaging` (Imagen), `other` (Otro).
- Estados (`status`): `normal` (Normal), `altered` (Alterado), `pending` (Pendiente).
- La fecha del estudio (`date`) no puede ser posterior al día actual.
- `resultSummary` es obligatorio si `status` es `normal` o `altered`; opcional si es `pending`.
- Los archivos son **opcionales**: un estudio pendiente todavía no tiene archivos, y algunos resultados se reciben solo como texto.
- Un estudio puede tener **hasta 10 archivos** (relación 1:N `MedicalTest` → `MedicalTestFile`): por ejemplo, una radiografía llega con el informe en PDF y varias placas en JPG.
- Formatos de archivo permitidos: `application/pdf`, `image/jpeg`, `image/png`. Tamaño máximo: 10 MB por archivo.
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
| `archivo` (BLOB) | (se pasa a la entidad `ArchivoEstudio`) | — |
| (no existe) | `isDeleted` | BOOLEAN |

Nueva entidad `ArchivoEstudio` (`MedicalTestFile`), relación 1:N con `Estudio`:

| Campo | Tipo |
| --- | --- |
| `idMedicalTestFile` | INT PK |
| `idMedicalTest` | INT FK |
| `file` | STRING (ruta) |
| `name` | STRING (nombre original) |

### Modelo de Datos (Django ORM - PostgreSQL)

```python
from django.db import models


def medical_test_file_upload_path(instance, filename):
    return f"medical_tests/pet_{instance.medicalTest.pet_id}/{filename}"


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
    isDeleted = models.BooleanField(default=False)

    class Meta:
        db_table = "medical_test"
        ordering = ["-date", "-idMedicalTest"]

    def __str__(self):
        return f"{self.name} ({self.pet_id})"


class MedicalTestFile(models.Model):
    idMedicalTestFile = models.AutoField(primary_key=True, db_column="idMedicalTestFile")
    medicalTest = models.ForeignKey(
        MedicalTest, on_delete=models.CASCADE, db_column="idMedicalTest", related_name="files"
    )
    file = models.FileField(upload_to=medical_test_file_upload_path, max_length=255)
    name = models.CharField(max_length=255)  # nombre original del archivo

    class Meta:
        db_table = "medical_test_file"
        ordering = ["idMedicalTestFile"]
```

### Configuración de archivos

```python
# core/settings.py
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

MEDICAL_TEST_MAX_SIZE = 10 * 1024 * 1024  # 10 MB por archivo
MEDICAL_TEST_MAX_FILES = 10  # archivos por estudio
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
| `newFiles` | FILE, se repite la clave por cada archivo (PDF/JPG/PNG, máx. 10 MB c/u, hasta 10) | No | (a agregar en el mockup) |

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
  "files": [
    {
      "idMedicalTestFile": 1,
      "name": "informe.pdf",
      "url": "http://192.168.0.13:8000/media/medical_tests/pet_3/informe.pdf"
    },
    {
      "idMedicalTestFile": 2,
      "name": "placa_1.jpg",
      "url": "http://192.168.0.13:8000/media/medical_tests/pet_3/placa_1.jpg"
    }
  ],
  "isDeleted": false
}
```

Si no se adjuntaron archivos, `files` es `[]`.

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
   - Completa el formulario y, opcionalmente, adjunta uno o varios archivos (`expo-document-picker` con selección múltiple desde Archivos, `expo-image-picker` con selección múltiple desde la Galería).
   - Envía `POST /api/v1/medical-test/` como `multipart/form-data`.
2. **Servidor (Django REST Framework)**:
   - `MedicalTestViewSet` usa `MultiPartParser` y `JSONParser`, y exige usuario autenticado.
   - `MedicalTestSerializer`:
     - `validate_name`: aplica `strip()` y rechaza cadenas vacías.
     - `validate_date`: rechaza fechas posteriores a `date.today()`.
     - `validate_newFiles`: para cada archivo controla `size <= MEDICAL_TEST_MAX_SIZE`, `size > 0`, extensión y `content_type` en `MEDICAL_TEST_ALLOWED_TYPES`.
     - `validate`: controla que el total de archivos no supere `MEDICAL_TEST_MAX_FILES`.
     - `files` (solo lectura): lista de `{idMedicalTestFile, name, url}`.
     - `validate`: si `status` es `normal` o `altered`, exige `resultSummary` no vacío.
     - `idPet` (`PrimaryKeyRelatedField` con `source="pet"`): queryset limitado a mascotas activas del usuario autenticado. Si el id no está, la vista responde `404 Not Found`.
     - `petName` (solo lectura, `source="pet.name"`): lo usa el historial general para el badge de la mascota.
   - En una transacción inserta el registro en `medical_test` y uno por archivo en `medical_test_file`; Django guarda los archivos en `MEDIA_ROOT/medical_tests/pet_<idPet>/`.
3. **Respuesta**:
   - Devuelve `201 Created` con el estudio creado. La app lo agrega a la lista en su grupo (Laboratorio, Imágenes, Otros) y, si está pendiente, en el aviso "Resultado pendiente".

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Alta completa con PDF** | Todos los campos válidos, `status = normal`, PDF de 2 MB. Se crea el registro y el archivo existe en disco. | `201 Created` |
| **Alta con imagen** | Igual al anterior con un JPG o PNG. | `201 Created` |
| **Alta con varios archivos** | Un PDF y cuatro JPG (informe + placas de una radiografía). Se crean 5 registros en `medical_test_file`. | `201 Created` |
| **Alta sin archivo** | Campos válidos, `status = normal`, `resultSummary` cargado, sin archivos. `files` queda `[]`. | `201 Created` |
| **Demasiados archivos** | Más de 10 archivos. No se guarda nada. | `400 Bad Request` |
| **Un archivo inválido entre varios** | Un PDF válido y un `.zip`. No se guarda ni el estudio ni el PDF. | `400 Bad Request` |
| **Alta pendiente** | `status = pending`, sin `resultSummary`, sin `resultDetail`, sin archivos. | `201 Created` |
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
- **"Modal · Subir estudio" no tiene campo para adjuntar archivo**, pero la tarjeta expandida muestra "Ver PDF" y "Compartir". Hay que agregar un campo "Archivos (opcional)" con botones "Archivos" / "Galería" y la lista de adjuntos con opción de quitar cada uno.
- La tarjeta expandida muestra un renglón por archivo (miniatura si es imagen, ícono si es PDF) con "Ver" y "Compartir" en lugar de un único "Ver PDF".

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
   - Crear `MedicalTestSerializer` en `Backend/api/serializers.py` con `validate_name`, `validate_date`, `validate_newFiles`, `validate` (resultado obligatorio según estado y máximo de archivos), `files` de solo lectura, `idPet` filtrado por dueño y `petName` de solo lectura.
4. **Etapa 4 - Endpoint y Enrutamiento:**
   - Definir `MedicalTestViewSet` en `Backend/api/views.py` con la acción `create`, parsers multipart y JSON, y permiso `IsAuthenticated`.
   - Registrar la ruta `medical-test/` en el router de `api/v1/`.
5. **Etapa 5 - Tests:**
   - Tests en `Backend/api/tests.py` con `APITestCase` y `SimpleUploadedFile`, usando `override_settings(MEDIA_ROOT=<carpeta temporal>)` para no ensuciar `media/`.