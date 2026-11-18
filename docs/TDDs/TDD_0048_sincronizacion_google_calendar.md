---
id: 0048
estado: Implementado
autor: Martina Lopez
fecha: 17-11-2026
titulo: Sincronización Automática con Google Calendar y Google Auth Nativo
---

# TDD-0048: Sincronización Automática con Google Calendar y Google Auth Nativo

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores cargan turnos veterinarios, vacunas y tratamientos médicos en PetLife, pero necesitan tener los recordatorios unificados en su calendario personal (Google Calendar) para no perder consultas ni olvidar tomas de medicamentos cuando no tienen la aplicación abierta.
- **Resultado esperado:**
  - Autenticación nativa oficial con Google Sign-In para Android e iOS, eliminando el proxy web de Expo (`auth.expo.io`).
  - Sincronización automática y transparente con la API v3 de Google Calendar cada vez que se crea, actualiza o elimina un turno, vacuna o tratamiento médico.
  - Programación de dosis de medicación con su horario particular según la frecuencia horaria y cantidad de tomas, con recordatorios emergentes en el minuto exacto de la toma.

### User Persona
- **Dueño / Tutor (`Owner`):** Quiere tener en su Google Calendar de Android o iPhone los turnos veterinarios y las alertas exactas de medicación de sus mascotas.
- **Equipo de desarrollo:** Requiere una integración desacoplada, idempotente (evitar eventos duplicados mediante `petlifeId`) y tolerante a fallos de red.

### User Story (HU-305)
**Como** dueño de una mascota,  
**quiero** que mis turnos veterinarios, vacunas y tomas de medicación se sincronicen automáticamente en mi Google Calendar,  
**para** recibir recordatorios en los horarios exactos de cada actividad sanitaria.

---

### Criterios de Aceptación

1. **Autenticación Nativa sin Proxy de Expo:**
   - En Android utiliza Google Play Services nativo (`@react-native-google-signin/google-signin`).
   - En iOS utiliza el SDK oficial de Google Sign-In (`GoogleSignIn.framework`).
   - Cero pantallas intermedias de Expo (`auth.expo.io`) en standalone builds / APK.
   - Funciona tanto en modo "En pruebas" (con usuarios de prueba) como en producción.

2. **Medicación Dosis por Dosis con Horario Particular:**
   - Si un tratamiento se toma cada cierta cantidad de horas (ej. cada 8 hs con hora de inicio 08:00):
     - Dosis 1: 08:00 hs
     - Dosis 2: 16:00 hs
     - Dosis 3: 00:00 hs (día siguiente)
     - Dosis 4: 08:00 hs
   - Cada dosis tiene recordatorio a los 0 minutos (en el momento de la toma) y 10 minutos antes.
   - Duración estimada de 15 minutos por toma.

3. **Turnos Veterinarios en su Horario Particular:**
   - Toma la hora exacta (`appointment.time`, ej. 15:30) y fecha del turno.
   - Duración de 1 hora.
   - Recordatorios automáticos: 1 hora antes y 24 horas antes.

4. **Vencimiento de Vacunas:**
   - Se crea un evento de día completo para la fecha de expiración.
   - Recordatorios: 1 día y 2 días antes.

5. **Sincronización Automática e Idempotente:**
   - Al crear o modificar un evento se sincroniza automáticamente en segundo plano.
   - Al eliminar un evento o tratamiento se borran automáticamente sus eventos de Google Calendar.
   - Se utiliza la propiedad privada `petlifeId` para actualizar en lugar de duplicar eventos.
   - Si el usuario no tiene Google vinculado, la aplicación opera normalmente sin errores ni bloqueos.

---

### Implementación Técnica

- **Librería Nativa:** `@react-native-google-signin/google-signin`
- **Servicio Principal:** `Frontend/src/services/googleCalendarService.ts`
- **API Consumida:** Google Calendar API v3 (`https://www.googleapis.com/calendar/v3/calendars/primary/events`)
- **Scope OAuth:** `https://www.googleapis.com/auth/calendar.events`
- **Tests Automatizados:** `Frontend/tests/googleCalendar.test.ts` (10/10 tests pasando)
