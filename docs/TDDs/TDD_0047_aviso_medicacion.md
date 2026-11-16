---
id: 0047
estado: En revisión
autor: Thiago Perez
fecha: 14-11-2026
titulo: Aviso de la medicación del día y módulo de notificaciones
---

# TDD-0047: Aviso de la medicación del día y módulo de notificaciones

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El dueño registra los tratamientos en la app, pero tiene que acordarse solo de cada toma. Es fácil saltear una dosis, sobre todo en tratamientos de varias tomas por día.
- **Resultado esperado:** El teléfono avisa en cada toma con el nombre del medicamento y de la mascota, en iOS y Android.
  - Base reutilizable para el resto de las notificaciones del sprint (vacunas, turnos, alimentación): sumar una nueva no requiere tocar la parte nativa.

### User Persona
- **Dueño / Tutor (`Owner`):** Lleva uno o varios tratamientos a la vez y necesita que la app le recuerde cada dosis.
- **Equipo de desarrollo:** Necesita una forma simple y única de programar avisos.

### User Story (HU-304)
**Como** dueño de una mascota,  
**quiero** que la app me avise cuando toca darle un medicamento,  
**para** no saltear dosis.

- **Sprint:** 3 (objetivo: Notificaciones). **Épica:** EP06 Calendario. **Prioridad:** Alta. **Estimación:** 3 SP.

---

### Criterios de Aceptación

**Escenario 1: Toca una dosis**  
DADO que Mandarina toma Meloxicam cada 24 horas a las 9:00  
CUANDO son las 9:00  
ENTONCES el dueño recibe "Hora del Meloxicam de Mandarina"

**Escenario 2: Tratamiento terminado**  
DADO que el tratamiento terminó ayer  
CUANDO llega la hora  
ENTONCES no recibe aviso

Además:
1. **Hora de la primera toma:** al cargar o editar un tratamiento se indica la hora de la primera toma (por defecto 09:00). Las siguientes se calculan sumando la frecuencia.
2. **Un aviso por toma:** título "Hora del {medicamento} de {mascota}" y detalle "Toma N de M · cada X hs".
3. **Siempre al día:** al crear, editar o eliminar un tratamiento, y cada vez que se abre la app, los avisos se recalculan.
4. **Permiso:** la app pide permiso de notificaciones recién cuando hay algo para avisar. Si el usuario lo niega, la app sigue funcionando sin avisos.
5. **Perfil > Notificaciones:** muestra el estado del permiso (con botón para activarlo o abrir los Ajustes), un interruptor por tipo de aviso, los próximos avisos programados y un botón para enviar un aviso de prueba.
6. **Cierre de sesión:** al cerrar sesión se borran los avisos pendientes de esa cuenta.
7. **Plataformas:** funciona igual en iOS y Android, en Expo Go y en los builds de TestFlight y APK.

---

### Reglas de Negocio
- Toma n = fecha de inicio + hora de la primera toma + n × frecuencia, con n de 0 a cantidad de tomas − 1.
- No se avisan tomas que ya pasaron ni posteriores a la última toma.
- Solo se programan los próximos 14 días y hasta 40 avisos de medicación (iOS admite 64 pendientes por app). Al abrir la app se completan los siguientes.
- Tratamientos eliminados, de mascotas eliminadas o de otros dueños no generan avisos.
- La hora es la del teléfono (zona horaria local del dueño).

---

## Dependencias y Estimación

### Dependencias
- **TDD-0021 a TDD-0024:** CRUD de `MedicationPet`.
- **PR #52 (rebranding) y PR #53 (Cloudinary):** esta rama parte de ambas.
- **`expo-notifications` ~58.1.9:** notificaciones locales (sin servidor de push).

### Estimación
- **Story Points:** 3.

---

## Diseño Técnico (RFC)

### Arquitectura
Notificaciones **locales**: el propio teléfono las programa con fecha y hora. No hace falta servidor de push, certificados de Apple ni Firebase, y funcionan sin conexión una vez programadas.

```
Backend (Render)                      Teléfono
GET /medication-pets/reminders/  -->  planner (función pura)  -->  replaceGroup()  -->  expo-notifications
  tratamientos activos               Reminder[]                    borra y reprograma     iOS / Android
```

1. **Fuente:** trae del backend los datos necesarios.
2. **Planner:** función pura que convierte esos datos en una lista de `Reminder` (título, texto, fecha). Se prueba sin teléfono.
3. **Sincronización:** por cada grupo, borra los avisos programados y programa los nuevos. Es idempotente: se puede llamar cuantas veces haga falta.

### Backend
- `MedicationPet.startTime` (`TimeField`, por defecto 09:00): hora de la primera toma. Migraciones `0026_medicationpet_starttime` y `0027_medicationpet_starttime_db_default`.
- `db_default` de 09:00 en la base: como Neon es compartida entre ramas, el código que no conoce el campo (ej. `main` antes del merge) puede seguir creando tratamientos.
- Serializer: `startTime` en formato `HH:MM`, opcional en alta y edición.
- `GET /api/v1/medication-pets/reminders/`: tratamientos con `endDate >= hoy` de todas las mascotas activas del dueño (no pide `idPet`).

### Frontend: `src/notifications/`
| Archivo | Qué hace |
|---|---|
| `types.ts` | `Reminder`, `ReminderGroup` y `ReminderSource`. |
| `channels.ts` | Un canal de Android por grupo (el usuario puede silenciar uno solo). |
| `notificationService.ts` | Configuración, permiso, `replaceGroup`, `cancelGroup`, `cancelAllReminders`. Única parte que usa `expo-notifications`. |
| `planners/medicationPlanner.ts` | `planMedicationReminders(tratamientos, ahora)`: HU-304. |
| `sources.ts` | Registro de fuentes: grupo, límite y cómo cargar sus avisos. |
| `sync.ts` | `syncReminders(grupos?)`: carga, pide permiso si hace falta y reprograma. Encola llamadas simultáneas. |
| `preferences.ts` | Qué tipos de aviso quiere el usuario (SecureStore). Por defecto, todos. |
| `useReminderSync.ts` | Hook usado en `App.tsx`: sincroniza al iniciar sesión y al volver a primer plano. |

Otros cambios:
- `CreateMedicationPetModal`: campo "Hora de la primera toma" y `syncReminders(['medication'])` al guardar.
- `MedicationPetList`: `syncReminders(['medication'])` al eliminar.
- `MedicationPetCard`: muestra la hora de la primera toma.
- `AuthContext.logout`: `cancelAllReminders()`.
- `NotificationSettingsScreen` (Perfil > Notificaciones): los interruptores salen de `REMINDER_SOURCES`, así que un grupo nuevo aparece solo.
- `app.json`: plugin `expo-notifications` con ícono blanco de huella (`assets/icons/notification-icon.png`) y color de marca.

### Cómo sumar otra notificación
Ver `docs/notificaciones.md`: agregar el grupo, su canal, un planner y una entrada en `sources.ts`.

---

## Plan de Pruebas (Test Cases)

**Backend** (`Backend/api/test_medication_reminders.py`, `python manage.py test api`):
1. `test_alta_sin_hora_usa_las_9`
2. `test_alta_con_hora`
3. `test_alta_hora_invalida`
4. `test_modificar_hora`
5. `test_devuelve_tratamientos_activos_de_todas_las_mascotas`
6. `test_excluye_tratamientos_terminados` (escenario 2)
7. `test_excluye_tratamientos_eliminados`
8. `test_excluye_mascotas_eliminadas_y_ajenas`
9. `test_no_pide_id_pet`
10. `test_requiere_autenticacion`
11. `test_alta_sin_campo_en_el_codigo_usa_default_de_la_base`

**Frontend** (`Frontend/tests/medicationPlanner.test.ts`, `npm run test:notifications`):
1. Escenario 1: aviso a las 9:00 con el texto "Hora del Meloxicam de Mandarina".
2. Escenario 2: tratamiento terminado ayer no genera avisos.
3. No avisa tomas pasadas y arranca en la siguiente.
4. Respeta el horizonte de días.
5. Ignora tratamientos eliminados.
6. Claves únicas y estables.
7. Hora por defecto 09:00 y formato `HH:MM:SS`.

**Manual** (Expo Go y build nativo, iOS y Android):
1. Crear un tratamiento con la primera toma 2 minutos más tarde: llega el aviso con la app cerrada.
2. Con la app abierta, el aviso se muestra como banner.
3. Editar la hora: el aviso viejo no llega y el nuevo sí.
4. Eliminar el tratamiento: no llega ningún aviso.
5. Negar el permiso: la app funciona igual, sin avisos.
6. Cerrar sesión: no llegan avisos de esa cuenta.
7. Perfil > Notificaciones: "Enviar aviso de prueba" llega a los 5 segundos; al apagar "Medicación" desaparecen los próximos avisos.
8. Android: en Ajustes > Notificaciones de PetLife aparece el canal "Medicación".

---

## Plan de Implementación por Etapas

### Etapa 1: Backend
- [x] `startTime`, migración, serializer y endpoint `reminders`.
- [x] Tests.

### Etapa 2: Módulo de notificaciones
- [x] `expo-notifications`, canales, permiso y sincronización por grupo.
- [x] Ícono de notificación de Android.

### Etapa 3: HU-304
- [x] Planner de medicación con tests.
- [x] Hora de la primera toma en el formulario y la tarjeta.
- [x] Sincronizar al guardar, eliminar, abrir la app y cerrar sesión.
- [x] Pantalla Perfil > Notificaciones.

### Etapa 4: Cierre
- [ ] Prueba manual en iPhone y Android.
- [x] Guía para el equipo (`docs/notificaciones.md`).

---

## Riesgos
- **App sin abrir por más de 14 días:** se dejan de programar avisos hasta que se abra. Mitigación: el horizonte es configurable (`MEDICATION_HORIZON_DAYS`); a futuro, una tarea en segundo plano o push desde el backend.
- **Límite de iOS (64 avisos):** la suma de los `limit` de `sources.ts` no debe pasar de 60.
- **Android con ahorro de batería:** algunos fabricantes pueden retrasar el aviso unos minutos.
- **Cambios desde otro teléfono:** se reflejan al volver a abrir la app en este.
- **Permiso negado:** la app no insiste; se puede activar desde los ajustes del teléfono.
