---
id: 0045
estado: En implementación
autor: Thiago Perez
fecha: 11-11-2026
titulo: Deploy de la app iOS con EAS Build y distribución por TestFlight
---

# TDD-0045: Deploy de la app iOS con EAS Build y distribución por TestFlight

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Hasta ahora la app solo se podía probar con Expo Go, conectada al backend local de quien la corría y en la misma red. Así el equipo, el profesor y usuarios reales no pueden instalarla en un iPhone y usarla de forma independiente.
- **Resultado esperado:** Generar un build nativo de iOS (`.ipa`) firmado con la cuenta de Apple Developer del equipo, conectado al backend deployado en Render, y distribuirlo por **TestFlight** para que cualquier tester invitado lo instale desde su iPhone sin Expo Go.
  - El build se genera en la nube con **EAS Build**, sin necesidad de Xcode local.
  - El envío a App Store Connect se hace con **EAS Submit**.
  - La configuración convive con el build de Android (APK) definido en `feature/deploy-config`, sobre un único proyecto de EAS.

### User Persona
- **Tester del equipo (internal tester):** Integrante del grupo que necesita probar cada versión en un iPhone real.
- **Profesor / evaluador (external tester):** Accede por link público de TestFlight sin formar parte de la cuenta de desarrollador.
- **Equipo de desarrollo:** Necesita un proceso repetible para generar y publicar nuevas versiones.

### User Story
**Como** integrante del equipo o evaluador,  
**quiero** instalar PetLife en mi iPhone desde TestFlight,  
**para** usar y evaluar la app real, conectada al backend en producción, sin depender de Expo Go ni de la computadora de un desarrollador.

---

### Criterios de Aceptación

1. **Build de iOS:**
   - `eas build -p ios --profile production` finaliza sin errores y genera un `.ipa` firmado con el Team ID de Apple Developer del equipo.
   - El build usa `EXPO_PUBLIC_API_URL = https://agiles-backend.onrender.com`.
2. **Envío a TestFlight:**
   - `eas submit -p ios --latest` sube el build a App Store Connect y queda en estado *Complete* dentro de TestFlight.
   - No se solicita el cuestionario de cifrado de exportación (`ITSAppUsesNonExemptEncryption: false`).
3. **Instalación y arranque:**
   - Un tester interno invitado recibe la invitación, instala la app desde TestFlight y la app **abre sin cerrarse** (sin crash al iniciar).
   - La app se muestra con el nombre **PetLife** y el ícono definido en `assets/icon.png`.
4. **Funcionamiento contra producción:**
   - Login con email y contraseña contra el backend de Render.
   - Navegación entre Inicio, Mascotas, Calendario y Perfil con datos reales.
5. **Versionado:**
   - Cada nuevo build incrementa automáticamente el *build number* (`autoIncrement` + `appVersionSource: remote`); dos builds nunca comparten número.
6. **Convivencia con Android:**
   - Los perfiles `development` y `preview` (APK) siguen funcionando igual que antes.

---

### Reglas de Negocio
- **Identificador único:** `bundleIdentifier` de iOS = `com.utn.grupo02`, igual al `package` de Android. Una vez registrado en Apple no se modifica.
- **Un solo proyecto de EAS:** Android e iOS comparten el mismo `projectId` y `owner` (organización del equipo en expo.dev), para compartir credenciales, historial de builds y numeración.
- **Credenciales fuera del repo:** El certificado de distribución, el provisioning profile y la API Key de App Store Connect quedan almacenados en los servidores de EAS. Nunca se commitean.
- **Variables de entorno por perfil:** Los builds no leen el `.env` local; las variables `EXPO_PUBLIC_*` se definen en `eas.json` por perfil.
- **Versiones nativas alineadas:** Todas las dependencias `expo-*` y `react-native-*` deben corresponder al mismo parche del SDK (validado con `npx expo-doctor`). Una versión desfasada compila igual pero **crashea al abrir** en el build nativo (ver Antecedentes).
- **Testers externos:** El primer build para un grupo externo pasa por *Beta App Review* de Apple; se deben completar *Test Information* y un usuario de prueba.

---

## Dependencias y Estimación

### Dependencias
1. **Apple Developer Program** activo (cuenta de Thiago Perez, Team ID `823S4SZ5CA`).
2. **App en App Store Connect** con bundle `com.utn.grupo02` (creada por EAS en el primer envío).
3. **Backend deployado** en Render (`https://agiles-backend.onrender.com`) con base de datos en Neon (`feature/deploy-config`).
4. **Proyecto de EAS compartido:** organización del equipo en expo.dev con los integrantes invitados (rol Developer o superior).
5. **Google Sign-In (opcional para este TDD):** OAuth Client ID de tipo iOS para `com.utn.grupo02` (TDD-0044).

### Estimación
- **Estimación total:** **5 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Configuración de `app.json` y `eas.json` para iOS: *1 SP*.
  - Credenciales de Apple, App Store Connect y TestFlight: *1 SP*.
  - Diagnóstico y corrección de dependencias nativas (crash al iniciar): *2 SP*.
  - Unificación con la configuración de Android y documentación: *1 SP*.

---

## Diseño Técnico (RFC)

### Flujo de distribución

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
    "extra": { "eas": { "projectId": "<projectId compartido>" } },
    "owner": "<organización del equipo>"
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

### Comandos
```bash
cd Frontend
npx expo-doctor                                   # validar versiones antes de compilar
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
npx eas-cli@latest build:version:set -p ios       # solo si se cambia de proyecto EAS
```

### Antecedentes: crash al iniciar (build 1 y 2)
- **Síntoma:** la app se cerraba al abrirla desde TestFlight, antes de mostrar cualquier pantalla.
- **Log (`.ips`):** `EXC_CRASH / SIGABRT`, `termination: DYLD, Symbol missing`.
  - Build 1: `ExpoFont` buscaba un símbolo inexistente en `ExpoModulesJSI`. Causa: `expo-font` **57.0.4** (SDK 57) quedaba en la raíz de `node_modules`, arrastrado por el `peerDependency` amplio de `@expo/vector-icons`, mientras el resto era SDK 58.
  - Build 2: tras fijar `expo-font` 58.0.12, este pedía un símbolo de `ExpoModulesCore` que la versión instalada (58.0.26, del paquete `expo` 58.0.19) no tenía.
- **Por qué no se veía antes:** Expo Go trae sus propios módulos nativos, así que el desfasaje solo aparece en un build nativo.
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

Pruebas manuales sobre un iPhone real con el build instalado desde TestFlight:

1. **`test_build_ios_production`:** `eas build -p ios --profile production` termina con estado *finished*.
2. **`test_submit_testflight`:** el build aparece en TestFlight como *Complete* y el grupo interno recibe la invitación.
3. **`test_arranque_sin_crash`:** la app abre y muestra la pantalla de Bienvenida; no se genera ningún `.ips` de PetLife en *Datos de análisis*.
4. **`test_nombre_e_icono`:** en la pantalla de inicio del iPhone se ve "PetLife" con el ícono correcto.
5. **`test_login_produccion`:** login con email y contraseña contra Render devuelve token y navega a Inicio (considerar hasta ~50 s en el primer pedido si Render estaba dormido).
6. **`test_navegacion_tabs`:** Inicio, Mascotas, Calendario y Perfil cargan datos reales.
7. **`test_android_preview_sin_regresion`:** `eas build -p android --profile preview` sigue generando un APK que abre correctamente.
8. **`test_expo_doctor`:** `npx expo-doctor` no reporta dependencias desfasadas.

---

## Plan de Implementación por Etapas

### Etapa 1: Configuración del proyecto
- [x] Agregar `ios.bundleIdentifier`, `infoPlist` e ícono en `app.json`.
- [x] Agregar perfil `production` con `autoIncrement` y `EXPO_PUBLIC_API_URL` en `eas.json`.
- [x] Unificar con la configuración de Android de `feature/deploy-config` (un solo `app.json` y `eas.json`).

### Etapa 2: Apple y App Store Connect
- [x] Alta en Apple Developer Program.
- [x] Generar certificado de distribución, provisioning profile y API Key de App Store Connect (rol App Manager) vía EAS.
- [x] Crear la app en App Store Connect y el grupo interno de TestFlight.

### Etapa 3: Corrección de dependencias nativas
- [x] Diagnosticar el crash al iniciar con el log `.ips` del iPhone.
- [x] Alinear dependencias al último parche del SDK 58.
- [ ] Validar con `npx expo-doctor` y nuevo build sin crash.

### Etapa 4: Proyecto de EAS compartido
- [ ] Crear organización del equipo en expo.dev e invitar integrantes.
- [ ] Transferir el proyecto de EAS a la organización y actualizar `owner` en `app.json`.
- [ ] Ajustar el build number remoto (`eas build:version:set -p ios`) por encima del último subido a TestFlight.

### Etapa 5: Distribución
- [ ] Invitar al equipo como testers internos.
- [ ] Completar *Test Information* y usuario de prueba; crear grupo externo con link público para el profesor.
- [ ] (Opcional) Configurar EAS Workflow de deploy automático en `main`.
- [ ] (Opcional) OAuth Client ID de iOS para Google Sign-In (`EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`).

---

## Riesgos
- **Render en plan gratuito se suspende por inactividad:** el primer pedido puede tardar ~50 s. Mitigación: despertar el backend antes de demos o pasar a un plan pago.
- **Revisión de Apple para testers externos:** al ofrecer login con Google, Apple puede exigir "Iniciar sesión con Apple" si la app se publica en la App Store.
- **Límite de builds del plan gratuito de EAS:** limitar builds automáticos a cambios en `Frontend/` o a tags.
- **Builds vencen a los 90 días en TestFlight:** generar un build nuevo antes de esa fecha si se necesita para la evaluación.
