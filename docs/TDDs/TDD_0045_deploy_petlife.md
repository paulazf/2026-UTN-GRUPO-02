---
id: 0045
estado: En implementación
autor: Angeles Schneeberger, Thiago Perez
fecha: 11-11-2026
titulo: Deploy de PetLife (backend en Render + Neon, Android APK e iOS TestFlight)
---

# TDD-0045: Deploy de PetLife (backend en Render + Neon, Android APK e iOS TestFlight)

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Hasta ahora la app solo se podía probar con Expo Go, conectada al backend local de quien la corría y en la misma red. Así el equipo, el profesor y usuarios reales no pueden instalarla en un iPhone y usarla de forma independiente.
- **Resultado esperado:** Tener PetLife funcionando de punta a punta fuera de las computadoras del equipo:
  - **Backend:** API Django deployada en **Render** (`https://agiles-backend.onrender.com`) con base de datos PostgreSQL en **Neon**, desplegada como infraestructura como código (`render.yaml`).
  - **Android:** APK generado con **EAS Build** (perfil `preview`) e instalable desde un link o QR.
  - **iOS:** build nativo (`.ipa`) firmado con la cuenta de Apple Developer del equipo y distribuido por **TestFlight** (EAS Build + EAS Submit), sin necesidad de Xcode local.
  - Ambas apps comparten un único proyecto de EAS dentro de la organización del equipo y apuntan al mismo backend.

### User Persona
- **Tester del equipo:** Integrante del grupo que necesita probar cada versión en un celular real (Android o iPhone).
- **Profesor / evaluador (external tester):** Accede por link público de TestFlight sin formar parte de la cuenta de desarrollador.
- **Equipo de desarrollo:** Necesita un proceso repetible para generar y publicar nuevas versiones.

### User Story
**Como** integrante del equipo o evaluador,  
**quiero** instalar PetLife en mi celular (APK en Android o TestFlight en iPhone) y que funcione contra un servidor en internet,  
**para** usar y evaluar la app real sin depender de Expo Go ni de la computadora de un desarrollador.

---

### Criterios de Aceptación

#### Backend (Render + Neon)
1. **Deploy reproducible:** el servicio `agiles-backend` se crea desde `render.yaml` (Blueprint) con `rootDir: Backend`, `buildCommand: ./build.sh` y `startCommand: gunicorn core.wsgi:application`.
2. **Build del backend:** `build.sh` instala dependencias, crea la carpeta `media`, ejecuta `collectstatic` y `migrate` sin errores.
3. **Base de datos:** con `DATABASE_URL` definida (Neon) Django usa esa conexión vía `dj-database-url`; sin ella usa la configuración local de siempre.
4. **Configuración de producción:** `DEBUG=False`, `SECRET_KEY` generada por Render, `ALLOWED_HOSTS` incluye `.onrender.com`, estáticos servidos con WhiteNoise y archivos de `media` accesibles por `/media/`.
5. **Migraciones:** existe una única migración de merge `0024_merge_20261111` que unifica las dos `0023`.

#### Android (APK)
6. **Build:** `eas build -p android --profile preview` genera un APK (`buildType: apk`) con `EXPO_PUBLIC_API_URL` apuntando a Render.
7. **Instalación:** el APK se instala desde el link o QR de EAS, abre sin cerrarse y muestra el nombre PetLife y su ícono (adaptive icon con `foregroundImage`).

#### iOS (TestFlight)
8. **Build de iOS:**
   - `eas build -p ios --profile production` finaliza sin errores y genera un `.ipa` firmado con el Team ID de Apple Developer del equipo.
   - El build usa `EXPO_PUBLIC_API_URL = https://agiles-backend.onrender.com`.
9. **Envío a TestFlight:**
   - `eas submit -p ios --latest` sube el build a App Store Connect y queda en estado *Complete* dentro de TestFlight.
   - No se solicita el cuestionario de cifrado de exportación (`ITSAppUsesNonExemptEncryption: false`).
10. **Instalación y arranque:**
   - Un tester interno invitado recibe la invitación, instala la app desde TestFlight y la app **abre sin cerrarse** (sin crash al iniciar).
   - La app se muestra con el nombre **PetLife** y el ícono definido en `assets/icon.png`.

#### Comunes
11. **Funcionamiento contra producción (Android e iOS):**
   - Login con email y contraseña contra el backend de Render.
   - Navegación entre Inicio, Mascotas, Calendario y Perfil con datos reales.
12. **Versionado:**
   - Cada nuevo build de producción incrementa automáticamente el número de build (`autoIncrement` + `appVersionSource: remote`); dos builds nunca comparten número.
13. **Un solo proyecto:**
   - Android e iOS se compilan desde el mismo `app.json`, `eas.json` y proyecto de EAS (`owner: grupo-02-utn`).

---

### Reglas de Negocio
- **Secretos fuera del repo:** `DATABASE_URL` (Neon) se carga a mano en Render (`sync: false`) y `SECRET_KEY` la genera Render; ninguno se commitea.
- **Identificador único:** `bundleIdentifier` de iOS = `com.utn.grupo02`, igual al `package` de Android. Una vez registrado en Apple no se modifica.
- **Un solo proyecto de EAS:** Android e iOS comparten el mismo `projectId` y `owner` (organización `grupo-02-utn` en expo.dev), para compartir credenciales, historial de builds y numeración.
- **Credenciales de firma fuera del repo:** el keystore de Android, el certificado de distribución de iOS, el provisioning profile y la API Key de App Store Connect quedan almacenados en los servidores de EAS. Nunca se commitean.
- **Variables de entorno por perfil:** Los builds no leen el `.env` local; las variables `EXPO_PUBLIC_*` se definen en `eas.json` por perfil.
- **Versiones nativas alineadas:** Todas las dependencias `expo-*` y `react-native-*` deben corresponder al mismo parche del SDK (validado con `npx expo-doctor`). Una versión desfasada compila igual pero **crashea al abrir** en el build nativo (ver Antecedentes).
- **Testers externos:** El primer build para un grupo externo pasa por *Beta App Review* de Apple; se deben completar *Test Information* y un usuario de prueba.

---

## Dependencias y Estimación

### Dependencias
1. **Apple Developer Program** activo (cuenta de Thiago Perez, Team ID `823S4SZ5CA`).
2. **App en App Store Connect** con bundle `com.utn.grupo02` (creada por EAS en el primer envío).
3. **Render:** cuenta con el repositorio conectado y el Blueprint `render.yaml` aplicado.
4. **Neon:** base de datos PostgreSQL creada y su cadena de conexión cargada como `DATABASE_URL` en Render.
5. **Backend (Python):** `gunicorn`, `whitenoise` y `dj-database-url` en `requirements.txt`.
6. **Proyecto de EAS compartido:** organización `grupo-02-utn` en expo.dev con los integrantes invitados (rol Developer o superior).
7. **Google Sign-In (opcional para este TDD):** OAuth Client ID de tipo iOS para `com.utn.grupo02` (TDD-0044).

### Estimación
- **Estimación total:** **8 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Backend en Render + Neon (`settings.py`, `build.sh`, `render.yaml`, media): *2 SP* (Angeles).
  - Build Android APK con EAS: *1 SP* (Angeles).
  - Build iOS, credenciales de Apple y TestFlight: *2 SP* (Thiago).
  - Diagnóstico y corrección de dependencias nativas (crash al iniciar): *2 SP* (Thiago).
  - Unificación en un solo proyecto de EAS y documentación: *1 SP* (ambos).

---

## Diseño Técnico (RFC)

### Arquitectura de deploy

```
 Android (APK, EAS)      iPhone (TestFlight)
          \                    /
           \   HTTPS (EXPO_PUBLIC_API_URL)
            ▼                 ▼
     Render: agiles-backend (Django + gunicorn + WhiteNoise)
                      │  DATABASE_URL
                      ▼
             Neon (PostgreSQL)
```

### Backend

#### `render.yaml`
```yaml
services:
  - type: web
    name: agiles-backend
    runtime: python
    plan: free
    rootDir: Backend
    buildCommand: "./build.sh"
    startCommand: "gunicorn core.wsgi:application --bind 0.0.0.0:$PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.13.0
      - key: DEBUG
        value: "False"
      - key: ALLOWED_HOSTS
        value: ".onrender.com,localhost,127.0.0.1"
      - key: SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        sync: false
```

#### `Backend/build.sh`
```bash
pip install --upgrade pip
pip install -r requirements.txt
mkdir -p media
python manage.py collectstatic --no-input
python manage.py migrate
```

#### `Backend/core/settings.py`
- `DATABASE_URL` presente: `dj_database_url.config(default=DATABASE_URL, conn_max_age=600, conn_health_checks=True)`; si no, PostgreSQL local.
- `ALLOWED_HOSTS` leído de variable de entorno.
- `WhiteNoiseMiddleware` y `STATIC_ROOT = BASE_DIR / 'staticfiles'`.
- `MEDIA_ROOT = BASE_DIR / 'media'`, servido por `re_path(r'^media/...', serve)` en `core/urls.py`.

### Android

```bash
cd Frontend
npx eas-cli@latest build -p android --profile preview
```
El link o QR del build permite descargar e instalar el APK directamente (instalación de orígenes desconocidos habilitada).

### iOS: flujo de distribución

```
push / merge ──> eas build -p ios (nube de Expo)
                     │  firma con certificado de distribución (EAS)
                     ▼
                 .ipa ──> eas submit -p ios ──> App Store Connect
                                                    │  procesamiento (5 a 30 min)
                                                    ▼
                                               TestFlight
                                     ┌──────────────┴──────────────┐
                              Grupo interno                  Grupo externo
                         (equipo, sin revisión)      (link público, Beta App Review)
```

### Configuración

#### `Frontend/app.json` (fragmento iOS)
```json
{
  "expo": {
    "name": "PetLife",
    "icon": "./assets/icon.png",
    "ios": {
      "bundleIdentifier": "com.utn.grupo02",
      "supportsTablet": false,
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "plugins": ["expo-status-bar", "expo-secure-store", "expo-sharing", "expo-font", "expo-web-browser"],
    "extra": { "eas": { "projectId": "<projectId del proyecto en grupo-02-utn>" } },
    "owner": "grupo-02-utn"
  }
}
```

#### `Frontend/eas.json`
```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_URL": "https://agiles-backend.onrender.com" }
    },
    "production": {
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_API_URL": "https://agiles-backend.onrender.com" }
    }
  },
  "submit": { "production": { "ios": {} } }
}
```

Fragmento Android del mismo `app.json`:
```json
"android": {
  "package": "com.utn.grupo02",
  "adaptiveIcon": { "foregroundImage": "./assets/icon.png", "backgroundColor": "#ffffff" }
}
```

### Comandos
```bash
cd Frontend
npx expo-doctor                                   # validar versiones antes de compilar
npx eas-cli@latest build -p android --profile preview
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
npx eas-cli@latest build:version:set -p ios       # solo si se cambia de proyecto EAS
```

### Antecedentes: crash al iniciar (build 1 y 2)
- **Síntoma:** la app se cerraba al abrirla desde TestFlight, antes de mostrar cualquier pantalla.
- **Log (`.ips`):** `EXC_CRASH / SIGABRT`, `termination: DYLD, Symbol missing`.
  - Build 1: `ExpoFont` buscaba un símbolo inexistente en `ExpoModulesJSI`. Causa: `expo-font` **57.0.4** (SDK 57) quedaba en la raíz de `node_modules`, arrastrado por el `peerDependency` amplio de `@expo/vector-icons`, mientras el resto era SDK 58.
  - Build 2: tras fijar `expo-font` 58.0.12, este pedía un símbolo de `ExpoModulesCore` que la versión instalada (58.0.26, del paquete `expo` 58.0.19) no tenía.
- **Por qué no se veía antes:** Expo Go trae sus propios módulos nativos, así que el desfasaje solo aparece en un build nativo. Afecta también al APK de Android, por eso el arreglo se aplica a ambas plataformas.
- **Solución:** actualizar el SDK al último parche (`npx expo install expo@^58.0.0` + `npx expo install --fix`), quedando `expo` 58.0.24, `expo-font` 58.0.12 y `expo-modules-core` 58.1.0, y declarar `expo-font` como dependencia directa.
- **Prevención:** correr `npx expo-doctor` antes de cada build.

### Deploy automático (opcional)
Con EAS Workflows, el repo vinculado al proyecto de EAS (base directory `Frontend`) puede compilar y enviar a TestFlight en cada merge a `main`:

```yaml
# Frontend/.eas/workflows/deploy-main.yml
name: Deploy a TestFlight
on:
  push:
    branches: ['main']
    paths: ['Frontend/**']
jobs:
  build_ios:
    type: build
    params: { platform: ios, profile: production }
  submit_ios:
    needs: [build_ios]
    type: submit
    params:
      platform: ios
      build_id: ${{ needs.build_ios.outputs.build_id }}
```
Considerar el límite mensual de builds del plan gratuito de EAS.

---

## Plan de Pruebas (Test Cases)

Pruebas manuales sobre el backend deployado y sobre celulares reales:

1. **`test_render_build`:** el deploy en Render termina con `collectstatic` y `migrate` sin errores y el servicio queda *Live*.
2. **`test_backend_admin`:** `https://agiles-backend.onrender.com/admin/` responde con el login de Django (HTTPS).
3. **`test_backend_neon`:** un registro creado desde la app aparece en la base de Neon.
4. **`test_media_upload`:** un estudio con archivo adjunto se sube y se abre desde `/media/...`.
5. **`test_android_apk`:** el APK de `preview` se instala, abre sin crash y loguea contra Render.
6. **`test_build_ios_production`:** `eas build -p ios --profile production` termina con estado *finished*.
7. **`test_submit_testflight`:** el build aparece en TestFlight como *Complete* y el grupo interno recibe la invitación.
8. **`test_arranque_sin_crash`:** la app abre y muestra la pantalla de Bienvenida; no se genera ningún `.ips` de PetLife en *Datos de análisis*.
9. **`test_nombre_e_icono`:** en la pantalla de inicio del celular se ve "PetLife" con el ícono correcto.
10. **`test_login_produccion`:** login con email y contraseña contra Render devuelve token y navega a Inicio (considerar hasta ~50 s en el primer pedido si Render estaba dormido).
11. **`test_navegacion_tabs`:** Inicio, Mascotas, Calendario y Perfil cargan datos reales.
12. **`test_expo_doctor`:** `npx expo-doctor` no reporta dependencias desfasadas.

---

## Plan de Implementación por Etapas

### Etapa 1: Backend en Render + Neon (Angeles)
- [x] Agregar `gunicorn`, `whitenoise` y `dj-database-url`.
- [x] Soportar `DATABASE_URL` (Neon) con fallback a la base local.
- [x] Script `build.sh` (dependencias, `media`, `collectstatic`, `migrate`).
- [x] Infraestructura como código en `render.yaml`.
- [x] Migración de merge `0024_merge_20261111`.
- [x] Servir archivos de `media` en producción.

### Etapa 2: Android APK (Angeles)
- [x] `android.package` y `adaptiveIcon` en `app.json`.
- [x] `eas.json` con perfil `preview` que genera APK.
- [x] Nombre PetLife e ícono de la app.

### Etapa 3: Configuración iOS (Thiago)
- [x] Agregar `ios.bundleIdentifier`, `infoPlist` e ícono en `app.json`.
- [x] Agregar perfil `production` con `autoIncrement` y `EXPO_PUBLIC_API_URL` en `eas.json`.
- [x] Unificar con la configuración de Android de `feature/deploy-config` (un solo `app.json` y `eas.json`).

### Etapa 4: Apple y App Store Connect (Thiago)
- [x] Alta en Apple Developer Program.
- [x] Generar certificado de distribución, provisioning profile y API Key de App Store Connect (rol App Manager) vía EAS.
- [x] Crear la app en App Store Connect y el grupo interno de TestFlight.

### Etapa 5: Corrección de dependencias nativas (Thiago)
- [x] Diagnosticar el crash al iniciar con el log `.ips` del iPhone.
- [x] Alinear dependencias al último parche del SDK 58.
- [ ] Validar con `npx expo-doctor` y nuevos builds de Android e iOS sin crash.

### Etapa 6: Proyecto de EAS compartido (ambos)
- [x] Crear organización `grupo-02-utn` en expo.dev e invitar integrantes.
- [x] Actualizar `owner` en `app.json` a `grupo-02-utn`.
- [x] Vincular `app.json` al proyecto de la organización (`projectId` 2c821368-5bcb-4cb3-ab5a-467ab9137ced).
- [ ] Ajustar el build number remoto (`eas build:version:set -p ios`) por encima del último subido a TestFlight.

### Etapa 7: Distribución (ambos)
- [ ] Compartir el link del APK con el equipo.
- [ ] Invitar al equipo como testers internos de TestFlight.
- [ ] Completar *Test Information* y usuario de prueba; crear grupo externo con link público para el profesor.
- [ ] (Opcional) Configurar EAS Workflow de deploy automático en `main`.
- [ ] (Opcional) OAuth Client ID de iOS para Google Sign-In (`EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`).

---

## Riesgos
- **Archivos de `media` no persistentes:** el disco de Render en plan gratuito se borra en cada deploy o reinicio, así que los archivos subidos (estudios, fotos) se pierden. Mitigación: mover `media` a un almacenamiento externo (por ejemplo S3, Cloudinary o Supabase Storage) o agregar un disco persistente en un plan pago.
- **Plan gratuito de Neon:** la base se suspende por inactividad y tiene límites de almacenamiento; la primera consulta tras la suspensión puede demorar unos segundos.
- **Render en plan gratuito se suspende por inactividad:** el primer pedido puede tardar ~50 s. Mitigación: despertar el backend antes de demos o pasar a un plan pago.
- **Revisión de Apple para testers externos:** al ofrecer login con Google, Apple puede exigir "Iniciar sesión con Apple" si la app se publica en la App Store.
- **Límite de builds del plan gratuito de EAS:** limitar builds automáticos a cambios en `Frontend/` o a tags.
- **Builds vencen a los 90 días en TestFlight:** generar un build nuevo antes de esa fecha si se necesita para la evaluación.
