---
id: 0046
estado: En revisión
autor: Thiago Perez
fecha: 13-11-2026
titulo: Rebranding de PetLife con temáticas de temporada
---

# TDD-0046: Rebranding de PetLife con temáticas de temporada

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** La app no tenía identidad visual propia: el nombre y el logo no aparecían dentro de la app, la carga era un spinner genérico y el color rosa estaba escrito fijo en cada pantalla.
- **Resultado esperado:** PetLife tiene una marca reconocible (logo de huella, nombre, pantalla de carga e ícono) que acompaña las fechas especiales del año sin cambiar la forma de usar la app.
  - Siete temáticas: Original, Navidad, San Valentín, Pascuas, Halloween, Primavera y Fechas patrias.
  - La temática se activa sola según la fecha y cambia colores, logo, adornos, pantalla de carga e ícono de la app.
  - El usuario no elige festividades: solo puede apagar la temática y volver a la paleta original.

### User Persona
- **Dueño / Tutor (`Owner`):** Usa la app a diario y valora que se sienta cuidada y cercana, sin que el diseño le complique encontrar la información de su mascota.
- **Equipo de desarrollo:** Necesita que las pantallas nuevas sigan la temática sin repetir colores fijos.

### User Story
**Como** tutor de una mascota,  
**quiero** que PetLife tenga su propia identidad y se ambiente en las fechas especiales,  
**para** sentir la app más cercana, con la opción de volver al diseño original si lo prefiero.

---

### Criterios de Aceptación

1. **Activación por fecha:**
   - Navidad: 1 al 31 de diciembre.
   - San Valentín: 7 al 14 de febrero.
   - Pascuas: los seis días previos al domingo de Pascua y el domingo (calculado para cada año).
   - Fechas patrias: 25 de mayo y 9 de julio.
   - Primavera: 21 de septiembre.
   - Halloween: 25 al 31 de octubre.
   - Fuera de esas fechas se usa la temática Original.
2. **Marca en la app:**
   - El header de Inicio muestra el logo de la temporada, el nombre "PetLife" y adornos de línea de la festividad.
   - La bienvenida muestra el mismo logo del header.
   - Al abrir la app se ve la pantalla de carga (logo, nombre y huellitas animadas) durante al menos 1,5 s.
3. **Color en toda la app:**
   - Links, botones principales, pestaña activa, tarjeta de agregar, foto por defecto, badges, filtros, modales y headers usan el color de la temporada.
   - Los colores de estado (vencida, por vencer, normal, alterado) no cambian.
4. **Interruptor en Perfil:**
   - El ítem "Temática de temporada" muestra la festividad activa y hasta cuándo.
   - Al apagarlo, toda la app vuelve a la paleta Original al instante.
   - La preferencia se guarda en el teléfono y se mantiene al cerrar la app.
5. **Ícono de la app:**
   - En builds nativos (TestFlight, APK), el ícono de la pantalla de inicio cambia al de la festividad activa al abrir la app.
   - Si la temática está apagada, vuelve al ícono Original.
6. **Accesibilidad:**
   - La animación de carga respeta "Reducir movimiento" del sistema.
   - Los adornos son decorativos: no reciben toques ni los lee el lector de pantalla.
   - El texto blanco sobre el color de cada header mantiene buen contraste.

---

### Reglas de Negocio
- **La temática no se elige:** el usuario solo puede apagarla. La vista previa de festividades existe únicamente para desarrollo y builds de prueba (`EXPO_PUBLIC_SEASON_PREVIEW`), y se quita antes de publicar en la tienda.
- **La marca no cambia de forma:** en todas las fechas la huella es la misma silueta. La festividad se expresa en el gesto interno (corazón, estrella, huevo, calabaza, flor, sol) y en el color.
- **Un solo origen de colores:** las pantallas no usan colores de marca fijos. Usan las clases `brand-*` o `brand.accent`.
- **Cambio de ícono solo si hace falta:** en iOS el sistema avisa cada vez que el ícono cambia, por eso solo se cambia cuando no coincide con la temporada.

---

## Dependencias y Estimación

### Dependencias
1. **Diseño:** Figma, página "PetLife · Rebranding v2 (propuesta)" (pantallas de Inicio, carga, Perfil, logos e íconos por festividad).
2. **Frontend:**
   - `react-native-svg` para el logo y los adornos.
   - `expo-alternate-app-icons` para los íconos por festividad (módulo nativo, requiere build nuevo).
   - NativeWind (`vars()`) para las variables de color.
3. **Build:** TDD-0045 (EAS Build y TestFlight) para probar el cambio de ícono.

### Estimación
- **Estimación total:** **8 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Diseño en Figma (logos, pantallas, íconos): *2 SP*.
  - Temáticas, contexto y colores en toda la app: *3 SP*.
  - Logo SVG, adornos, header, pantalla de carga y glitter: *2 SP*.
  - Íconos alternativos de la app: *1 SP*.

---

## Diseño Técnico (RFC)

### Arquitectura

```
seasons.ts (paletas + fechas)
        │
        ▼
ThemeProvider ── temporada = vista previa ?? (interruptor ? fecha : original)
   │      │
   │      ├── vars() de NativeWind → clases bg-brand, text-brand, bg-brand-tint...
   │      ├── brand.ts → brand.accent para props (Ionicons, ActivityIndicator)
   │      └── syncAppIcon() → ícono alternativo (iOS / Android)
   ▼
useSeasonTheme() → BrandHeader, LoadingScreen, PawLogo, SeasonDecor, Perfil
```

### Archivos principales
| Archivo | Responsabilidad |
|---|---|
| `src/theme/seasons.ts` | Paletas, fechas, cálculo de Pascua, bandera de vista previa |
| `src/theme/brand.ts` | Colores vigentes para props que no aceptan className |
| `src/theme/appIcon.ts` | Cambio del ícono de la app (ignorado en Expo Go) |
| `src/context/ThemeContext.tsx` | Temporada activa, interruptor persistido, vista previa, variables CSS |
| `src/components/brand/PawLogo.tsx` | Logo SVG por festividad; glitter con textura en Navidad |
| `src/components/brand/SeasonDecor.tsx` | Adornos de línea (header y pantalla completa) |
| `src/components/brand/BrandHeader.tsx` | Header de Inicio |
| `src/components/brand/LoadingScreen.tsx` | Pantalla de carga animada |
| `assets/icons/`, `assets/textures/` | Íconos de la app y texturas de glitter |

### Paletas
| Temática | Header | Acento | Tono suave |
|---|---|---|---|
| Original | `#E87A8E` | `#DE6B80` | `#FCECEF` |
| Navidad | `#B3343B` | `#B3343B` | `#FBEAEA` |
| San Valentín | `#C8325F` | `#C8325F` | `#FDE8EF` |
| Pascuas | `#7A5BB5` | `#7A5BB5` | `#F0EAFA` |
| Halloween | `#4C1D95` | `#C2410C` | `#FDEDE3` |
| Primavera | `#2F7D5B` | `#2F7D5B` | `#E6F4EC` |
| Fechas patrias | `#2F6EA8` | `#2F6EA8` | `#E3EEF8` |

### Uso en pantallas nuevas
```tsx
// Clases (se actualizan solas con la temporada)
<Text className="text-brand font-bold">Ver todas</Text>
<View className="bg-brand-tint rounded-2xl" />

// Props que no aceptan className
import { brand } from '../theme/brand';
<Ionicons name="paw" size={22} color={brand.accent} />
```

### Configuración (`app.json`)
- Ícono principal: `assets/icons/original-ios.png`; Android adaptive con `original-android.png` sobre `#E87A8E`.
- Plugin `expo-alternate-app-icons` con seis íconos: Navidad, SanValentin, Pascuas, Halloween, Primavera y Patrias.

---

## Plan de Pruebas (Test Cases)

Pruebas manuales en Expo Go y en un build de TestFlight o APK:

1. **`test_temporada_por_fecha`:** con `EXPO_PUBLIC_SEASON` o la vista previa, cada festividad cambia header, logo, adornos y colores.
2. **`test_original_fuera_de_fecha`:** sin vista previa, en una fecha sin festividad se ve la temática Original.
3. **`test_interruptor_perfil`:** al apagar la temática, toda la app vuelve a Original; al cerrar y abrir la app, sigue apagada.
4. **`test_pantalla_carga`:** al abrir la app se ve la pantalla de carga; con "Reducir movimiento" las huellitas aparecen quietas.
5. **`test_colores_en_modales`:** crear mascota, detalle, estudios, vacunas y calendario usan el color de la temporada.
6. **`test_colores_de_estado`:** vencida, por vencer y normal mantienen sus colores en todas las temáticas.
7. **`test_icono_app`:** en TestFlight, al elegir una festividad en la vista previa el ícono cambia (con el aviso de iOS); con la temática apagada vuelve al Original.
8. **`test_expo_go_sin_icono`:** en Expo Go la app no falla aunque el módulo de íconos no exista.
9. **`test_expo_doctor`:** `npx expo-doctor` sin dependencias desfasadas.

---

## Plan de Implementación por Etapas

### Etapa 1: Diseño
- [x] Propuesta en Figma: Inicio, pantalla de carga y Perfil para las siete temáticas.
- [x] Logos por festividad (estrella con glitter en Navidad, ojos triangulares en Halloween).
- [x] Íconos de la app por festividad.

### Etapa 2: Base de temáticas
- [x] Paletas, fechas y cálculo de Pascua (`seasons.ts`).
- [x] `ThemeProvider` con interruptor persistido y vista previa.
- [x] Clases `brand-*` con variables de NativeWind y `brand.ts` para props.

### Etapa 3: Marca y pantallas
- [x] Logo SVG, adornos, header de marca y pantalla de carga.
- [x] Color de temporada en todas las pantallas y modales.
- [x] Bienvenida, login y registro con la temática.
- [x] Interruptor en Perfil.

### Etapa 4: Ícono de la app
- [x] Íconos iOS y Android en `assets/icons/`.
- [x] `expo-alternate-app-icons` configurado y sincronizado con la temporada.
- [ ] Verificar el cambio de ícono en TestFlight y en el APK.

### Etapa 5: Cierre
- [ ] Revisión del equipo en iOS y Android.
- [ ] Antes de publicar en la tienda: quitar `EXPO_PUBLIC_SEASON_PREVIEW` de `eas.json`.

---

## Riesgos
- **Aviso de iOS al cambiar el ícono:** es del sistema y no se puede ocultar. Se minimiza cambiando el ícono solo cuando hace falta.
- **El ícono no cambia en Android al instante:** depende del launcher; puede tardar o reordenarse en el escritorio.
- **Pantallas nuevas con colores fijos:** si alguien vuelve a escribir `#DE6B80`, esa pantalla no sigue la temporada. Mitigación: usar las clases `brand-*` (documentado arriba).
- **Glitter a tamaño chico:** a 44 px la textura se percibe como un brillo suave; el efecto completo se ve en la carga, la bienvenida y el ícono.
