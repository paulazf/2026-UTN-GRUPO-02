---
id: 0001
estado: Por implementar
autor: Martina Lopez
fecha: 04-10-2026
titulo: Inicio y Cierre de Sesión de Owner (Login / Logout)
---

# TDD-0001: Inicio y Cierre de Sesión de Owner (Login / Logout)

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Cada dueño tiene que poder volver a entrar a su cuenta desde su celular y ver únicamente la información que cargó. Además, todos los endpoints de mascotas, estudios, vacunas, etc. necesitan saber quién hace cada petición.
- **Resultado esperado:** Permitir iniciar sesión con email y contraseña (el servidor devuelve un token de autenticación), usar ese token en cada petición y cerrar sesión invalidándolo. La sesión no vence sola: la persona no tiene que volver a loguearse mientras no cierre sesión.

### User Persona
- **Dueño / Tutor (`Owner`):** Usuario registrado que abre la app y quiere acceder a sus mascotas, y que cuando lo decide quiere cerrar su sesión en el dispositivo.

### User Story
**Como** dueño de una mascota, **quiero** iniciar sesión con mi email y mi contraseña y poder cerrar sesión cuando quiera, **para que** mi información esté protegida y solo yo pueda verla.

### Criterios de Aceptación
- **Escenario de éxito (Login):**
  - Si se envían un `email` y una `password` que corresponden a un `Owner` activo (`isDeleted = false`), el sistema devuelve `200 OK` con el token y los datos del `Owner`.
- **Escenario de éxito (Logout):**
  - Si se envía `POST /api/v1/auth/logout/` con un token válido, el sistema elimina el token y devuelve `204 No Content`. Desde ese momento ese token ya no sirve para ninguna petición.
- **Escenario de éxito (Petición autenticada):**
  - Toda petición a un endpoint protegido que incluya `Authorization: Token <token>` válido se ejecuta como el `Owner` dueño del token (`request.user`).
- **Escenario de fallo (Datos faltantes):**
  - Si falta `email` o `password`, o están vacíos, devuelve `400 Bad Request`.
- **Escenario de fallo (Credenciales incorrectas):**
  - Si el email no existe, la contraseña es incorrecta o la cuenta fue dada de baja, devuelve `401 Unauthorized` con **el mismo mensaje** en los tres casos ("Email o contraseña incorrectos."), para no revelar si el email está registrado.
- **Escenario de fallo (Token ausente o inválido):**
  - Si una petición a un endpoint protegido no incluye token, el token no existe (por ejemplo, ya se cerró sesión) o la cuenta fue dada de baja, devuelve `401 Unauthorized`.

### Reglas de Negocio
- Se inicia sesión con **email + contraseña**. El email no distingue mayúsculas de minúsculas ("Valentina@Email.com" entra igual que "valentina@email.com"). La **contraseña sí** las distingue.
- El login solo considera cuentas activas (`isDeleted = false`). Una cuenta dada de baja no puede iniciar sesión ni usar su token.
- Se usa el **token de Django REST Framework** (`rest_framework.authtoken`): una cadena aleatoria de 40 caracteres que se guarda en la tabla `authtoken_token`.
- **Cada `Owner` tiene un solo token**. Si inicia sesión desde otro dispositivo, recibe el mismo token. Consecuencia: cerrar sesión en un dispositivo cierra la sesión en todos.
- El token **no vence** ni se renueva (no hay refresh token). Deja de valer solo al cerrar sesión, al cambiar la contraseña (TDD-0002) o al dar de baja la cuenta (TDD-0003).
- Todos los endpoints de datos del usuario exigen `IsAuthenticated` y filtran por `request.user`. Un `Owner` nunca ve datos de otro.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidad `Owner` y configuración de autenticación (TDD-0000):** modelo `Owner` como usuario de Django, `OwnerManager.get_by_natural_key`, `rest_framework.authtoken` y `TokenAuthentication`.
2. **Mockup (Figma, "Autenticación"):** Pantalla "Iniciar sesión" y error de credenciales. Falta la opción de cerrar sesión.

### Estimación
- **Estimación total:** **5 Story Points** (Escala Fibonacci).
- **Desglose:**
  - `LoginSerializer`, endpoint `POST /api/v1/auth/login/`, endpoint `POST /api/v1/auth/logout/` y tests: *2 SP*
  - Pantalla Expo de login, header `Authorization` en todas las peticiones, restauración de sesión al abrir la app, cierre de sesión y manejo del `401`: *3 SP*

---

## Diseño Técnico (RFC)

### Funcionamiento del token (resumen)
1. Al registrarse o iniciar sesión, el servidor busca el token del `Owner` o lo crea (`Token.objects.get_or_create(user=owner)`).
2. El cliente lo guarda y lo envía en cada petición: `Authorization: Token 9944b091...`.
3. `TokenAuthentication` busca esa clave en `authtoken_token`, obtiene el `Owner` asociado y lo deja disponible como `request.user`.
4. Cerrar sesión elimina la fila del token. La próxima petición con esa clave da `401`.

### Contrato de API (Django REST Framework ↔ Expo Mobile)

#### Login

- **Endpoint:** `POST /api/v1/auth/login/`
- **Autenticación:** No requiere (`AllowAny`).
- **Content-Type:** `application/json`

##### Request Body (JSON)

```json
{
  "email": "valentina@email.com",
  "password": "MiClave2026"
}
```

##### Response Body (`200 OK`)

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "owner": {
    "idOwner": 1,
    "firstName": "Valentina",
    "lastName": "García",
    "email": "valentina@email.com",
    "phone": null,
    "isDeleted": false,
    "created_at": "2026-10-04T10:45:00Z"
  }
}
```

##### Response Body (`401 Unauthorized`)

```json
{
  "detail": "Email o contraseña incorrectos."
}
```

#### Logout

- **Endpoint:** `POST /api/v1/auth/logout/`
- **Autenticación:** Requiere `Authorization: Token <token>` (`IsAuthenticated`).
- **Request Body:** No requiere body.

##### Response Body (`204 No Content`)
- *Respuesta vacía al cerrarse la sesión.*

##### Petición sin token o con token inválido (`401 Unauthorized`)

```json
{
  "detail": "Las credenciales de autenticación no se proveyeron."
}
```

### Código de referencia

```python
# Backend/api/serializers.py
class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        owner = authenticate(
            request=self.context.get("request"),
            username=attrs["email"].strip(),   
            password=attrs["password"],         
        )
        if owner is None:
            raise AuthenticationFailed("Email o contraseña incorrectos.")
        attrs["owner"] = owner
        return attrs


# Backend/api/views.py
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        owner = serializer.validated_data["owner"]
        token, _ = Token.objects.get_or_create(user=owner)
        return Response({"token": token.key, "owner": OwnerSerializer(owner).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.auth.delete()  
        return Response(status=status.HTTP_204_NO_CONTENT)
```

---

## Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (React Native + Expo)**:
   - **Login:** la pantalla "Iniciar sesión" envía `POST /api/v1/auth/login/`. Al recibir `200`, guarda el `token` en `expo-secure-store` y los datos del `owner` en el estado de la app. Ante `401` muestra el banner "Email o contraseña incorrectos. Intentá de nuevo."
   - **Peticiones:** un único cliente HTTP (`Frontend/src/services/api.ts`) agrega `Authorization: Token <token>` a todas las peticiones, menos registro y login.
   - **Al abrir la app:** si hay token guardado, entra directo a la app sin pedir login. Si no, muestra la pantalla de bienvenida.
   - **Logout:** el botón "Cerrar sesión" envía `POST /api/v1/auth/logout/`; haya respondido o no, el cliente borra el token y los datos locales y vuelve a la pantalla de bienvenida.
   - **Cualquier `401`** en una petición protegida: el cliente borra el token y vuelve al login (la sesión se cerró en otro dispositivo, o la cuenta se dio de baja).
2. **Servidor (Django REST Framework)**:
   - Login: `LoginSerializer` normaliza el email, llama a `authenticate()` y obtiene o crea el token.
   - Logout: elimina el token usado en la petición (`request.auth`).
   - `TokenAuthentication` rechaza con `401` los tokens inexistentes y los de cuentas con `is_active == False` (cuentas dadas de baja).
3. **Respuesta**:
   - Login: `200 OK` con `{ token, owner }`. Logout: `204 No Content`.

---

## Casos de Prueba y Casos de Borde

| Escenario | Validación / Regla de Negocio | Código HTTP |
| --- | --- | --- |
| **Login correcto** | Email y contraseña válidos de una cuenta activa. Devuelve token y `owner`. | `200 OK` |
| **Email con otra capitalización** | Registrado como "valentina@email.com", se envía "VALENTINA@Email.com". Entra. | `200 OK` |
| **Email con espacios en los extremos** | `" valentina@email.com "`. Entra. | `200 OK` |
| **Segundo login (otro dispositivo)** | Devuelve el mismo token que el primero. | `200 OK` |
| **Contraseña con otra capitalización** | Registrada como "MiClave2026", se envía "miclave2026". | `401 Unauthorized` |
| **Contraseña incorrecta** | Email correcto, contraseña errónea. Mismo mensaje genérico. | `401 Unauthorized` |
| **Email inexistente** | Mismo mensaje genérico que la contraseña incorrecta. | `401 Unauthorized` |
| **Cuenta dada de baja** | Email de un `Owner` con `isDeleted = true` (y sin cuenta activa nueva). Mismo mensaje genérico. | `401 Unauthorized` |
| **Cuenta dada de baja y recreada** | Hay una cuenta baja y otra activa con el mismo email. Solo entra con la contraseña de la activa. | `200 OK` |
| **Falta email o contraseña** | Campo ausente o vacío. | `400 Bad Request` |
| **Logout correcto** | Con token válido. El token se elimina de `authtoken_token`. | `204 No Content` |
| **Token usado tras el logout** | Cualquier petición con el token eliminado. | `401 Unauthorized` |
| **Logout con otro dispositivo activo** | Al compartir el token, el otro dispositivo también queda sin sesión. | `204 No Content` |
| **Logout sin token** | Petición sin header `Authorization`. | `401 Unauthorized` |
| **Token con formato incorrecto** | `Authorization: Token` sin valor, o `Bearer <token>`. | `401 Unauthorized` |
| **Token de cuenta dada de baja** | Un token que quedó de una cuenta con `isDeleted = true`. | `401 Unauthorized` |
| **Endpoint protegido sin token** | Por ejemplo `GET /api/v1/pets/` sin credenciales. | `401 Unauthorized` |
| **Falla de Persistencia** | Error de conexión con PostgreSQL. | `500 Internal Server Error` |

---

## Plan de Implementación

1. **Etapa 1 - Serializer y Vistas (Backend):**
   - Crear `LoginSerializer` en `Backend/api/serializers.py`.
   - Crear `LoginView` y `LogoutView` en `Backend/api/views.py` (`AllowAny` para login, `IsAuthenticated` para logout).
2. **Etapa 2 - Rutas (Backend):**
   - Registrar `auth/login/` y `auth/logout/` en `urls.py` bajo `api/v1/`.
   - Revisar que el resto de las vistas declaren `permission_classes = [IsAuthenticated]` y filtren por `request.user`.
3. **Etapa 3 - Integración Móvil (Frontend Expo):**
   - Centralizar el header `Authorization` y el manejo del `401` en `Frontend/src/services/api.ts`.
   - Implementar la pantalla de login, la restauración de sesión al abrir la app con `expo-secure-store` y el botón "Cerrar sesión".
4. **Etapa 4 - Tests:**
   - Tests con `APITestCase` de cada caso de la tabla, verificando en la base que el token se elimina en el logout y que se conserva el mismo token en un segundo login.
