## Contexto
Implementación completa del flujo de Autenticación y Gestión de Perfil del Dueño (Owner) en la app móvil (React Native + Expo). Se crearon las vistas de Perfil, Configuración, Edición de Perfil y Cambio de Contraseña, alineadas estrictamente a los mockups de Figma. Además, se refactorizó la navegación para proteger las rutas privadas y manejar el estado de la sesión globalmente a través del `AuthContext`.

## Cambios Realizados

### Frontend
- **Configuración Global (`App.tsx`, `AuthContext.tsx`, `RootNavigator.tsx`):**
  - Reemplazo de importaciones obsoletas de `SafeAreaView` por `react-native-safe-area-context` para evitar warnings.
  - Creación del `RootNavigator` dividiendo el stack en rutas públicas (Welcome, Login, Register) y privadas (Home, Profile, Settings, EditProfile, ChangePassword).
  - Integración del método `updateToken` en `AuthContext` para permitir la renovación silenciosa del token (ej. al cambiar de contraseña) sin desencadenar pantallas de carga que desmonten la navegación.
- **Vistas de Autenticación (`WelcomeScreen`, `LoginScreen`, `RegisterScreen`):**
  - Implementación fiel al mockup.
  - Corrección de problemas de teclado en Android en la pantalla de Registro mediante el uso de `ScrollView` y `keyboardShouldPersistTaps`.
- **Vista de Perfil (`ProfileScreen.tsx`):**
  - Encabezado con color sólido, foto de perfil, y renderizado dinámico del `firstName`, `lastName` y `email` obtenidos directamente del contexto.
  - Listado de menú (Mascotas, Notificaciones, Veterinarios, Historial, Configuración) con íconos estandarizados de `Ionicons`.
- **Vista de Configuración (`SettingsScreen.tsx`):**
  - Nueva pantalla que agrupa las acciones de "Editar perfil", "Cambiar contraseña" y "Eliminar cuenta", junto con el botón de "Cerrar sesión".
  - Lógica de Baja Lógica (Eliminar cuenta) nativa mediante `Alert.alert`. Al confirmar, llama al backend, elimina la cuenta y limpia la sesión local forzando el retorno al Welcome.
- **Vista de Edición de Perfil (`EditProfileScreen.tsx`):**
  - Formulario para actualizar nombre, apellido y teléfono (`PATCH /owner/me/`).
  - Campo de email deshabilitado visualmente (ícono de candado).
  - Al guardar exitosamente, actualiza el estado global (`updateUserData`) y regresa automáticamente.
- **Vista de Cambio de Contraseña (`ChangePasswordScreen.tsx`):**
  - Formulario seguro (`POST /owner/me/password/`) con validación de coincidencia y longitud de la nueva contraseña.
  - Uso de `updateToken` para guardar el nuevo token sin romper el historial de navegación.

## TDDs Relacionados
- TDD-0000: Flujo de Registro e Inicio de Sesión
- TDD-0001: Visualización y Modificación de Datos de Perfil
- TDD-0002: Cambio de Contraseña
- TDD-0003: Baja Lógica de Cuenta

## Checklist de Verificación
- [x] Navegación protegida: no se puede acceder al Home sin un token válido.
- [x] Las pantallas respetan los estilos visuales del mockup (colores, sombras, pill-buttons).
- [x] El `ProfileScreen` obtiene los datos en tiempo real del contexto (sin hardcodeo).
- [x] `EditProfileScreen` permite modificar datos personales y se reflejan al instante.
- [x] `ChangePasswordScreen` valida las contraseñas, actualiza el token silenciosamente y retrocede correctamente.
- [x] `SettingsScreen` permite la eliminación de cuenta con un modal de confirmación irreversible.
- [x] Cierre de sesión funcionando correctamente desde `SettingsScreen`.
- [x] Solución de problemas de teclado (`ScrollView` bottom padding) en Android.

## Consideraciones
- **Botón Provisorio en Home:** Se agregó temporalmente un botón en `HomeScreen` ("Ir a Mi Perfil") para poder navegar a la sección de perfil hasta que se implemente la Bottom Navigation Bar (Tab Navigator) en futuras fases.
- **Después de bajar la rama:** Correr `npm install` (por si acaso) y reiniciar Expo Go apretando "R" en la terminal para limpiar caché de navegación.
