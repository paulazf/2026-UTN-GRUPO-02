---
id: 0049
estado: Por implementar
autor: Paula Zacarías
fecha: 17-11-2026
titulo: Compartir libreta sanitaria en PDF con el veterinario (HU-307)
---

# TDD-0049: Compartir libreta sanitaria en PDF con el veterinario (HU-307)

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Cuando un dueño acude a una consulta o urgencia con un veterinario, necesita hacerle llegar la historia clínica y libreta sanitaria de su mascota por los canales de mensajería que utiliza habitualmente (WhatsApp, correo electrónico, etc.). Sin una opción directa de compartir desde la aplicación, el usuario tendría que salir de la app, localizar el archivo descargado en las carpetas internas del celular y adjuntarlo manualmente, generando demoras y fricción.
- **Resultado esperado:** Permitir al dueño enviar la libreta sanitaria en PDF directamente desde el perfil de su mascota a través de WhatsApp, Mail u otras aplicaciones instaladas en su teléfono, mediante el menú de compartir nativo del sistema operativo.
- **Inmutabilidad de la copia compartida:** Asegurar que el documento enviado sea una copia estática y cerrada (un *snapshot* del historial clínico al momento exacto de emisión). Cualquier cambio posterior en la aplicación (como el registro de una nueva vacuna al día siguiente) no modifica de forma retroactiva el archivo que ya fue transmitido.

### User Persona
- **Dueño de mascota (Owner):** Usuario registrado que requiere enviar la historia clínica completa de su mascota a un profesional veterinario de manera rápida antes de ingresar a la consulta médica.
- **Profesional Veterinario:** Receptor del documento, quien recibe un archivo PDF completo, formal y cerrado con la fecha de emisión explícita.

### User Story (HU-307)
**Como** dueño de una mascota,  
**quiero** mandar el PDF por WhatsApp o mail desde la app,  
**para** que el veterinario lo tenga antes de la consulta.

- **Sprint:** Sprint 3 (Objetivo: Exportar libreta en PDF).
- **Épica:** EP10 Historia Clínica.
- **Prioridad:** Alta.
- **Estimación:** 2 Story Points (SP).

### Criterios de Aceptación
- **Escenario 1 (Compartir):**
  - **DADO** que se generó el PDF de la libreta sanitaria,
  - **CUANDO** el dueño toca "Compartir" (o "Compartir libreta"),
  - **ENTONCES** se abre el menú de compartir nativo del celular con el archivo PDF adjunto listo para enviar por WhatsApp, correo u otra app.
- **Escenario 2 (Copia fija):**
  - **DADO** que el dueño compartió el PDF ayer con el veterinario,
  - **CUANDO** hoy registra una vacuna nueva en la aplicación,
  - **ENTONCES** el PDF ya enviado no cambia ni se modifica retroactivamente.
- **Escenario de soporte no disponible:**
  - Si el dispositivo o entorno no cuenta con soporte para invocar el menú nativo de compartir (`Sharing.isAvailableAsync() = false`), la aplicación notifica al usuario mediante un diálogo informativo indicando que la función no está disponible en el dispositivo, evitando fallos o bloqueos.
- **Escenario de cancelación por el usuario:**
  - Si el usuario abre el diálogo de compartir pero luego presiona "Cancelar" o pulsa fuera del menú sin seleccionar una aplicación, la pantalla de detalle de la mascota retorna a su estado normal sin emitir errores.

### Reglas de Negocio
- **Copia fija e inmutable:** El archivo compartido es un documento binario independiente con fecha de emisión impresa. No mantiene enlaces dinámicos ni dependencias en vivo con la base de datos de PetLife. Las modificaciones posteriores en el sistema solo se verán reflejadas si el usuario genera y comparte un nuevo PDF.
- **Seguridad y pertenencia:** La libreta sanitaria solo puede ser descargada y compartida por el dueño titular de la mascota (`request.user.owner_profile == pet.owner`).
- **Nomenclatura limpia:** El archivo temporal adjunto se genera con el formato `libreta_{nombre_mascota}.pdf` (normalizando caracteres especiales y espacios).
- **MIME Type estandarizado:** La acción de compartir debe declarar explícitamente `mimeType: application/pdf` y `UTI: com.adobe.pdf` para que las aplicaciones de destino (WhatsApp, Gmail, etc.) reconozcan de inmediato el archivo como un documento PDF.
- **Almacenamiento temporal limpio:** El archivo se descarga en el directorio de caché local del dispositivo (`Paths.cache/medical-history/`) y se reemplaza en cada exportación para no saturar el almacenamiento del teléfono.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Generación de Historia Clínica en PDF (TDD-0048 / Rama `feature/export_medical_history`):**
   - Endpoint backend: `GET /api/v1/pets/{id}/medical-history/pdf/` implementado con ReportLab.
   - Función de descarga en frontend: `downloadMedicalHistoryPdf(petId, petName)` en `Frontend/src/services/petService.ts`.
2. **Librerías del cliente móvil instaladas:**
   - `expo-sharing`: Módulo oficial de Expo para invocar el diálogo nativo de compartir del sistema operativo (*Android Sharesheet* / *UIActivityViewController* de iOS).
   - `expo-file-system`: Módulo para la manipulación y verificación de archivos en el sistema de archivos local del teléfono.

### Estimación
- **Estimación total:** **2 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Integración de `expo-sharing` con acción y feedback de carga en `PetDetailScreen`: *1 SP*
  - Manejo de excepciones, verificación de `isAvailableAsync`, inmutabilidad y pruebas de usuario: *1 SP*

---

## Diseño Técnico (RFC)

### Arquitectura y Flujo (Cliente-Servidor)

1. **Cliente (`PetDetailScreen.tsx`):**
   - El usuario visualiza la pantalla de detalle de su mascota y presiona el botón *"Compartir libreta"*.
   - El componente activa el estado `isExporting = true` para deshabilitar pulsaciones repetidas y mostrar un spinner de carga (`ActivityIndicator`).
2. **Servicio (`petService.ts`):**
   - Invoca a `downloadMedicalHistoryPdf(petId, petName)`, la cual efectúa una solicitud `GET /api/v1/pets/{id}/medical-history/pdf/` con el token de autenticación.
   - El backend responde con el flujo binario `application/pdf`.
   - `File.downloadFileAsync` almacena el documento en `Paths.cache/medical-history/libreta_{nombre_mascota}.pdf` y retorna el `fileUri` local.
3. **Módulo de Compartir (`expo-sharing`):**
   - Se valida `await Sharing.isAvailableAsync()`.
   - Se invoca `Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Libreta sanitaria de ...', UTI: 'com.adobe.pdf' })`.
   - El sistema operativo despliega el menú nativo (*Android Sharesheet* o *iOS UIActivityViewController*) presentando las aplicaciones disponibles (WhatsApp, Gmail, Mail, Telegram, etc.) con el PDF adjunto.
4. **Finalización y Restauración:**
   - Una vez que el usuario selecciona la app de destino o cancela el diálogo, se restablece `isExporting = false`.
   - El destinatario (veterinario) recibe una copia binaria fija y estática del archivo.

---

### Componentes y Servicios Frontend

1. Servicio de Compartir (`Frontend/src/services/petService.ts`)
2. Interfaz de Usuario (`Frontend/src/screens/pet/PetDetailScreen.tsx`)


## Casos de Prueba y Casos de Borde

| Escenario de Prueba | Validación / Regla de Negocio | Resultado Esperado |
| --- | --- | --- |
| **Compartir exitoso (Escenario 1)** | DADO que se generó el PDF, el usuario toca "Compartir". | Se invoca `Sharing.shareAsync` y se abre el menú nativo con WhatsApp, Mail, etc., con el PDF adjunto. |
| **Copia fija e inmutable (Escenario 2)** | El dueño compartió el PDF ayer y hoy registra una vacuna nueva. | El archivo PDF que fue transmitido o recibido no sufre alteraciones ni muta retroactivamente. |
| **Cancelación por el usuario** | El usuario abre el menú de compartir y luego toca "Cancelar" o fuera del menú. | El menú se cierra sin lanzar errores y la pantalla vuelve a su estado normal interactivo. |
| **Dispositivo sin soporte de compartir** | Entorno donde `Sharing.isAvailableAsync()` devuelve `false` (p. ej. entorno web o sandbox restringido). | Muestra un `Alert` informando que el dispositivo no soporta compartir nativo, sin romper la aplicación. |
| **Falla de conexión o error de backend** | Pérdida de conexión al descargar el PDF previo (`500` o timeout). | Captura el error en el bloque `catch`, restablece `isExporting = false` y muestra una alerta clara al usuario. |
| **Prevención de doble pulsación (Debounce)** | El usuario toca repetidamente el botón mientras se descarga el PDF. | El botón se mantiene deshabilitado (`disabled={isExporting}`) con un spinner hasta que el menú se despliega. |

---

## Plan de Implementación

1. **Etapa 1 - Verificación de Dependencias y Contrato:**
   - Confirmar que la rama `feature/export_medical_history` esté disponible o mergeada para contar con el endpoint `GET /api/v1/pets/{id}/medical-history/pdf/` y la función `downloadMedicalHistoryPdf`.
   - Verificar la instalación de `expo-sharing` en `Frontend/package.json`.
2. **Etapa 2 - Implementación en Frontend:**
   - Incorporar en `Frontend/src/services/petService.ts` la función `shareMedicalHistoryPdf`.
   - En `Frontend/src/screens/pet/PetDetailScreen.tsx`, integrar el botón *"Compartir libreta"* con ícono `share-social-outline` de Ionicons.
   - Manejar el estado de carga (`isExporting`) y el control de errores con `Alert.alert`.
3. **Etapa 3 - Verificación de Criterios de Aceptación:**
   - Probar en dispositivo físico (Android e iOS) el envío real hacia WhatsApp y aplicaciones de correo.
   - Verificar el Escenario 2 registrando una nueva atención sanitaria tras haber enviado un PDF previo y corroborando la inmutabilidad de la copia enviada.
