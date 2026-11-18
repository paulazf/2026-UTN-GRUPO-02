---
id: 0051
estado: En implementación
autor: Paula Zacarías
fecha: 18-11-2026
titulo: Tutorial inicial de bienvenida y propósito de PetLife (HU-308)
---

# TDD-0051: Tutorial inicial de bienvenida y propósito de PetLife (HU-308)

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Cuando un nuevo tutor descarga PetLife por primera vez, ingresaba directamente a una pantalla de autenticación sin comprender en pocos segundos la propuesta de valor de la aplicación ni qué problemas resuelve (libreta sanitaria, recordatorios automáticos de vacunas y compartir la ficha clínica con el veterinario). Esto genera dudas y abandono antes del registro.
- **Resultado esperado:** Una experiencia de Onboarding interactiva de 3 pantallas concisas y visualmente atractivas que explican el propósito de PetLife en pocos segundos, con posibilidad de saltar directamente al registro, mostrándose solo la primera vez y permitiendo volver a consultarla en cualquier momento desde un botón de "Ayuda".

### User Persona
- **Nuevo Tutor (`Owner`):** Descarga la app por recomendación o búsqueda en la tienda y necesita saber rápidamente si la app le sirve para organizar la salud de sus mascotas antes de crear una cuenta.
- **Tutor Existente:** Ya utiliza la app pero ante dudas quiere refrescar qué funcionalidades ofrece desde la sección de ayuda.

### User Story
**Como** dueño que descarga PetLife por primera vez,  
**quiero** entender en pocos segundos qué hace la app,  
**para** decidir si registro a mi mascota.

- **Sprint:** Sprint 3 (Rebranding y propósito). **Épica:** EP01 Gestión de Usuario. **Estimación:** 3 SP.

---

## Criterios de Aceptación (Gherkin)

### Escenario 1: Primera vez
**DADO** que el dueño abre la app por primera vez  
**CUANDO** pasa la bienvenida  
**ENTONCES** ve en hasta 3 pantallas qué puede hacer: libreta, avisos y compartir con el veterinario.

### Escenario 2: Saltar
**DADO** que está en la bienvenida o tutorial  
**CUANDO** toca "Saltar"  
**ENTONCES** va directo a crear su cuenta (`RegisterScreen`).

### Escenario 3: Solo una vez
**DADO** que ya vio la bienvenida  
**CUANDO** vuelve a abrir la app  
**ENTONCES** no la ve de nuevo (inicia directamente en la pantalla de bienvenida o autenticación habitual).

### Escenario 4: Volver a ver el tutorial
**DADO** que el dueño ya vio la bienvenida  
**CUANDO** toca el botón "Ayuda" en la app (desde Configuración o Perfil)  
**ENTONCES** vuelve a ver las pantallas del tutorial, y puede cerrarlas cuando quiera regresando a donde estaba.

---

## Reglas de Negocio

1. **Contenido de las 3 pantallas:**
   - **Pantalla 1 (Libreta Sanitaria Digital):** Historial clínico, vacunas, estudios médicos, desparasitaciones y ficha médica unificada.
   - **Pantalla 2 (Avisos y Recordatorios):** Notificaciones automáticas de vencimiento de vacunas y tomas de medicación para no olvidar cuidados clave.
   - **Pantalla 3 (Compartir con el Veterinario):** Exportación de la libreta sanitaria en PDF y envío directo por WhatsApp o email antes de cada consulta.
2. **Acción de Saltar:** El botón "Saltar" está visible en las pantallas iniciales del tutorial y conduce inmediatamente a `RegisterScreen`, registrando que el tutorial ya fue visualizado.
3. **Persistencia local con SecureStore:**
   - Se utiliza la clave `@petlife_has_seen_onboarding`.
   - Si no está presente, se asume que es la primera ejecución y se muestra el tutorial.
   - Al tocar "Saltar" o completar la última diapositiva, se persiste `@petlife_has_seen_onboarding = 'true'`.
4. **Modo Consulta / Ayuda:**
   - Accesible tanto para usuarios no autenticados como autenticados (a través de un botón "Ayuda" en `SettingsScreen` y `ProfileScreen`).
   - Al abrirse en modo ayuda (`isHelpMode = true`), el botón "Saltar" se reemplaza por un botón de cierre (`close` / "Cerrar") que permite descartar el tutorial en cualquier diapositiva sin alterar el estado de sesión ni redirigir forzosamente a registro.
5. **Diseño institucional y de temporada:**
   - Se utilizan los colores de marca de PetLife (`palette.accent`, `palette.header` de `ThemeContext`), garantizando armonía estética con el rebranding de temporadas.

---

## Diseño Técnico (RFC)

### 1. Servicio de almacenamiento (`Frontend/src/services/onboardingService.ts`)
```typescript
export const ONBOARDING_SEEN_KEY = '@petlife_has_seen_onboarding';

export async function hasSeenOnboarding(): Promise<boolean>;
export async function markOnboardingAsSeen(): Promise<void>;
export async function resetOnboarding(): Promise<void>;
```

### 2. Componente de Pantalla (`Frontend/src/screens/OnboardingScreen.tsx`)
- Implementado con `FlatList` horizontal o `ScrollView` con `pagingEnabled: true` y `showsHorizontalScrollIndicator: false`.
- Indicador de 3 puntos (dots) de paginación que reflejan el slide actual (`currentIndex`).
- Botón superior "Saltar" (o botón "Cerrar" en modo ayuda).
- Botón inferior dinámico:
  - Slides 1 y 2: "Siguiente" (avanza el carrusel).
  - Slide 3: "Crear mi cuenta" (guarda flag y navega a `RegisterScreen`) junto a link "¿Ya tenés cuenta? Iniciar sesión".

### 3. Navegación (`Frontend/src/navigation/RootNavigator.tsx`)
- Al cargar el estado inicial de autenticación en `RootNavigator`, también se lee `hasSeenOnboarding()`.
- Si `!hasSeenOnboarding` y no hay token de usuario, la pantalla inicial es `Onboarding`.
- Se registra `Onboarding` en la pila pública de rutas y en la pila privada para permitir invocarlo desde "Ayuda".

### 4. Botón "Ayuda" en Configuración y Perfil
- En `SettingsScreen.tsx`: nueva opción **"Ayuda y tutorial"** con ícono `help-circle-outline`.
- Al tocar, ejecuta `navigation.navigate('Onboarding', { isHelpMode: true })`.

---

## Plan de Pruebas

1. **Pruebas unitarias de lógica y cálculo (`tests/onboarding.test.ts`):**
   - Validación de las 3 diapositivas definidas con títulos, descripciones e íconos.
   - Lógica de avance de slide y cálculo de botón final vs botón siguiente.
   - Lectura y escritura de flags de onboarding.
2. **Pruebas manuales (iOS y Android):**
   - **Caso 1:** Instalación limpia -> Se abre el Onboarding de 3 pantallas con Libreta, Avisos y Compartir.
   - **Caso 2:** Tocar "Saltar" en la pantalla 1 -> Navega directamente a `RegisterScreen`.
   - **Caso 3:** Cerrar la app y reabrirla -> Ya no muestra el Onboarding, ingresa directo a `WelcomeScreen`.
   - **Caso 4:** Usuario logueado toca "Ayuda" en Configuración -> Se despliega el tutorial con botón "Cerrar" que permite regresar a la app en cualquier momento.
