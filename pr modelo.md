## Contexto
Implementación completa de la entidad `MedicalTest` (Estudio Médico) en el backend (Django REST Framework) y de la pestaña "Estudios" en la app móvil (React Native + Expo), permitiendo que el dueño registre, consulte, modifique y elimine los estudios veterinarios de sus mascotas con su archivo adjunto (PDF o imagen). Se tomó como base el diseño técnico de los documentos TDD-0010, TDD-0011, TDD-0012 y TDD-0013, y el mockup de Figma (pantallas "Estudios" y "Subir estudio").

## Cambios Realizados

### Backend
- **Modelo (`models/medical_test.py`):**
  - Creación del modelo `MedicalTest` con campos `idMedicalTest`, `pet`, `name`, `type`, `date`, `veterinarian`, `status`, `resultSummary`, `resultDetail`, `file` e `isDeleted`.
  - Relación 1:N con `Pet` mediante FK con `on_delete=PROTECT` (columna `idPet`).
  - Enumerados para tipo (`laboratory`, `imaging`, `other`) y estado (`normal`, `altered`, `pending`).
  - Archivo opcional guardado en `media/medical_tests/pet_<idPet>/` (`FileField`, se guarda la ruta en la base).
- **Migraciones (`migrations/`):**
  - `0008_medical_test.py`: Migración de esquema para la creación de la tabla `medical_test`, vinculada a `0007_alter_medication_options`.
- **Serializador y Validaciones (`serializers/medical_test.py`):**
  - `MedicalTestSerializer`: Limpieza de espacios (`strip()`) y rechazo con `400 Bad Request` ante nombres vacíos o formados únicamente por espacios.
  - Validación de fecha no futura y de valores permitidos para tipo y estado.
  - Validación de archivo: solo PDF, JPG, JPEG o PNG, no vacío y hasta 10 MB.
  - Resultado resumido obligatorio cuando el estado es Normal o Alterado (opcional si es Pendiente).
  - Mascota inexistente o dada de baja devuelve `404 Not Found`. Intento de cambiar la mascota en la edición devuelve `400 Bad Request`.
  - Al reemplazar el archivo, el anterior se borra del disco recién al confirmar la transacción (`transaction.on_commit`).
- **Endpoints y ViewSet (`views/medical_test.py`):**
  - `MedicalTestViewSet`: Exposición del CRUD completo.
  - Alta (`POST /api/v1/medical-test/`): Acepta `multipart/form-data` (con archivo) o JSON.
  - Listado (`GET /api/v1/medical-test/`): Filtra automáticamente registros activos de mascotas activas, ordenados por fecha descendente. Admite filtros opcionales `?idPet=` y `?status=`.
  - Detalle (`GET /api/v1/medical-test/{id}/`): Consulta de registros activos.
  - Modificación (`PATCH /api/v1/medical-test/{id}/`): Actualización parcial. `PUT` deshabilitado (`405 Method Not Allowed`).
  - Baja lógica (`DELETE /api/v1/medical-test/{id}/`): Realiza soft delete asignando `isDeleted = True` y devuelve `204 No Content`, conservando el registro y el archivo.
  - Si el ID no existe, ya estaba dado de baja o pertenece a una mascota dada de baja, retorna `404 Not Found`.
- **Rutas (`urls.py`):** Registro de la ruta `api/v1/medical-test/` en el router.
- **Configuración (`core/settings.py`, `core/urls.py`, `docker-compose.yml`):**
  - `MEDIA_URL`, `MEDIA_ROOT`, tamaño máximo y formatos permitidos para estudios.
  - Servicio de archivos subidos en desarrollo.
  - Volumen `media_data` en el servicio `api` para que los archivos persistan entre reinicios.
- **Admin (`admin.py`):** Registro de `MedicalTest` con filtros por tipo, estado y baja lógica.
- **Tests (`tests.py`):** 48 casos de prueba que cubren las tablas de casos de borde de los 4 TDDs.

### Frontend
- **Dependencias (`package.json`):** `expo-document-picker`, `expo-file-system` y `expo-sharing` (SDK 57).
- **Servicios (`services/medicalTests.ts`, `services/pets.ts`):** Cliente de la API de estudios con manejo de errores por campo, y lectura de la mascota para el encabezado.
- **Componentes (`components/medical-tests/`):**
  - `MedicalTestsTab`: Contador de estudios, aviso "Resultado pendiente", secciones por tipo (Laboratorio, Imágenes, Otros), ver y compartir archivo, y confirmación de baja.
  - `MedicalTestCard`: Tarjeta expandible con badge de estado, resultado y acciones Ver, Compartir, Editar y Eliminar.
  - `MedicalTestFormSheet`: Bottom sheet de alta y edición con los campos del mockup y el campo para adjuntar archivo. En la edición envía solo los campos modificados.
- **Pantalla (`screens/PetMedicalTestsScreen.tsx`):** Pantalla provisoria para probar la pestaña hasta que exista la navegación y el detalle de mascota. `App.tsx` la muestra con la mascota `1`.

## TDDs Relacionados
- TDD-0010: Alta de Estudio Médico (`POST /api/v1/medical-test/`)
- TDD-0011: Consulta de Estudios Médicos (`GET /api/v1/medical-test/` y `GET /api/v1/medical-test/{id}/`)
- TDD-0012: Modificación de Estudio Médico (`PATCH /api/v1/medical-test/{id}/`)
- TDD-0013: Eliminación Lógica de Estudio Médico (`DELETE /api/v1/medical-test/{id}/`)

## Checklist de Verificación
- [x] Modelo `MedicalTest` definido con relación a `Pet`, enumerados de tipo y estado, archivo opcional y flag `isDeleted`.
- [x] Migración de esquema `0008_medical_test.py` creada y vinculada correctamente (`makemigrations --check` sin cambios pendientes).
- [ ] Alta con PDF, con imagen, sin archivo y como pendiente (`201 Created`).
- [x] Validación de campos vacíos, valores inválidos, fecha futura y resultado faltante (`400 Bad Request`).
- [ ] Validación de formato y tamaño de archivo (`400 Bad Request`).
- [x] Mascota o estudio inexistente, dado de baja o de mascota dada de baja (`404 Not Found`).
- [x] Reemplazo de archivo con borrado del anterior, y conservación del anterior cuando la validación falla.
- [x] Baja lógica (`isDeleted=True`) implementada con respuesta `204 No Content`.
- [x] Registros dados de baja lógica excluidos de listado, detalle y edición.
- [x] Tests ejecutados con `python manage.py test api` (48 OK).
- [x] Registro y visualización correcta en Django Admin.
- [ ] Frontend sin errores de tipos (`npx tsc --noEmit`).
- [x] Flujo probado en Expo Go: subir, ver, compartir, editar, cargar resultado de un pendiente y eliminar.

## Consideraciones
- **Autenticación pendiente:** la API todavía no filtra los estudios por dueño. Cuando esté la autenticación, se agrega el filtro en `active_pets()` de `serializers/medical_test.py` (`.filter(idOwner=...)`).
- **Pantalla provisoria:** cuando exista el detalle de mascota, se usa `<MedicalTestsTab petId={...} />` dentro de esa pantalla y se vuelve a `HomeScreen` en `App.tsx`.
- **Después de bajar la rama:** correr `docker compose exec api python manage.py migrate` y `npm install` en `Frontend/`.