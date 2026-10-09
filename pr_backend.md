## Contexto
Implementación completa de la entidad `Owner` (Dueño) en el backend (Django REST Framework), abarcando el flujo de registro, autenticación y gestión de la cuenta. Para resolver la autenticación de manera robusta y compatible con el ecosistema de Django sin afectar los modelos del resto del equipo, se estructuró la entidad `Owner` vinculada al modelo nativo `User` mediante una relación `OneToOneField`. Se tomaron como base los requerimientos de los TDDs 0000 al 0003.

## Cambios Realizados

### Backend
- **Modelo (`models/owner.py`):**
  - Creación del modelo `Owner` con campos `idOwner` (Primary Key), `firstName`, `lastName`, `email`, `phone`, e `isDeleted`.
  - Relación 1:1 con el sistema de autenticación: `user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='owner_profile')`.
- **Migraciones (`migrations/`):**
  - `0008_owner.py`: Migración de esquema para la creación de la tabla `owner` vinculada a la tabla `auth_user` estándar de Django.
- **Serializadores y Validaciones (`serializers/owner.py`):**
  - `OwnerSerializer`: Maneja el alta de usuario en una transacción atómica (`@transaction.atomic`), creando simultáneamente el `User` base para credenciales y el `Owner` con los datos de negocio.
  - `OwnerUpdateSerializer`: Permite la actualización parcial de los campos modificables (`firstName`, `lastName`, `phone`).
  - `ChangePasswordSerializer`: Valida que la contraseña actual sea correcta antes de permitir el cambio por una nueva.
- **Endpoints y Vistas (`views/owner.py` y `views/auth.py`):**
  - Alta de Dueño (`POST /api/owner/`): Crea la cuenta y devuelve inmediatamente el token de autenticación (Registro + Auto-Login).
  - Login (`POST /api/auth/login/`): Verifica credenciales y devuelve el token junto con el objeto del perfil activo.
  - Perfil Propio (`GET /api/owner/me/`): Retorna los datos del dueño autenticado.
  - Modificación (`PATCH /api/owner/me/`): Actualización de datos personales.
  - Cambio de Contraseña (`POST /api/owner/me/password/`): Actualiza la clave de forma segura, elimina el token de sesión anterior y genera uno nuevo, forzando la invalidación en otros dispositivos.
  - Baja Lógica (`DELETE /api/owner/me/`): Ejecuta el soft delete asignando `isDeleted = True`. Desactiva al usuario base (`is_active = False`) y renombra el correo anexándole un UUID para liberar el email original y permitir un nuevo registro a futuro. Retorna `204 No Content`.
- **Rutas (`urls.py`):** Registro de las rutas bajo los prefijos `api/owner/` y `api/auth/`.

## TDDs Relacionados
- TDD-0000: Alta de Dueño / Registro
- TDD-0001: Modificación de Datos del Dueño
- TDD-0002: Cambio de Contraseña
- TDD-0003: Eliminación Lógica de Dueño

## Checklist de Verificación
- [x] Modelo `Owner` definido con relación a `User` (OneToOne), campos personales y flag `isDeleted`.
- [x] Migración `0008_owner.py` creada correctamente sin generar conflictos con el historial de migraciones de otros módulos.
- [x] Alta de dueño operando de forma transaccional (crea Auth User y Owner juntos).
- [x] Login protegido que verifica credenciales correctamente.
- [x] Cambio de contraseña funcional, exige la contraseña actual e invalida el token viejo.
- [x] Baja lógica (`isDeleted=True`) implementada, limpiando el token activo y liberando el email original.
- [x] Endpoints (GET, PATCH, POST, DELETE) protegidos con `IsAuthenticated` donde corresponde.

## Consideraciones
- **Transparencia para el equipo:** Quienes necesiten hacer relaciones (ej: en el CRUD de Mascotas o Turnos), deben importar y utilizar el modelo `Owner` y su clave primaria `idOwner`. La tabla de la base de datos es `owner`. La relación OneToOne con `User` es de uso exclusivamente interno para autenticación y no afecta sus queries.
- **Después de bajar la rama:** Correr `python manage.py migrate` para crear las tablas necesarias.
